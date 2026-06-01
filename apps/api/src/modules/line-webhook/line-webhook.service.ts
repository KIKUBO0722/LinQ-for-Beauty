import {
  Inject,
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { webhook } from '@line/bot-sdk';
import * as schema from '@linq-beauty/db';
import { customers, lineAccounts } from '@linq-beauty/db';
import { DB } from '../../database/database.module';
import { LineService, type LineCredentials } from '../line/line.service';
import { MessagesService } from '../messages/messages.service';
import { CustomersService } from '../customers/customers.service';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class LineWebhookService {
  private readonly logger = new Logger(LineWebhookService.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly lineService: LineService,
    private readonly messagesService: MessagesService,
    private readonly customersService: CustomersService,
  ) {}

  /**
   * webhook の入口。署名検証 → イベントごとに振り分け。
   * 1 イベントの失敗が全体を落とさないよう各イベントを try/catch で隔離する
   * (1 件でも 500 を返すと LINE が webhook 全体を再送し続けるため)。
   */
  async handleCallback(
    tenantId: string,
    rawBody: Buffer | undefined,
    signature: string | undefined,
  ): Promise<void> {
    if (!rawBody || !signature) {
      throw new BadRequestException('Missing request body or signature');
    }

    // tenantId のテナントの LINE アカウント (v0.1 = 1 店舗 1 アカウント前提。
    // 複数アカウントの destination 振り分けは将来対応)。
    const [account] = await this.db
      .select()
      .from(lineAccounts)
      .where(eq(lineAccounts.tenantId, tenantId))
      .limit(1);

    if (!account) {
      // 鍵未設定 (接続前) → 再送を誘発しないよう正常終了する (ログのみ)。
      this.logger.warn(`No LINE account for tenant ${tenantId} — webhook ignored`);
      return;
    }

    // なりすまし防止: 署名照合。不一致は 401 (LINE は再送しない)。
    const valid = this.lineService.validateWebhookSignature(
      rawBody,
      signature,
      account.channelSecret,
    );
    if (!valid) {
      throw new UnauthorizedException('Invalid LINE signature');
    }

    const credentials: LineCredentials = {
      channelSecret: account.channelSecret,
      channelAccessToken: account.channelAccessToken,
    };
    const body = JSON.parse(rawBody.toString('utf-8')) as webhook.CallbackRequest;

    for (const event of body.events ?? []) {
      try {
        await this.dispatch(tenantId, account.id, credentials, event);
      } catch (e) {
        this.logger.error(
          `Webhook event failed (type=${event.type}): ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }

  private async dispatch(
    tenantId: string,
    lineAccountId: string,
    credentials: LineCredentials,
    event: webhook.Event,
  ): Promise<void> {
    const source = event.source;
    const userId = source && source.type === 'user' ? source.userId : undefined;

    switch (event.type) {
      case 'follow': {
        // 友だち追加 / ブロック解除 → 顧客を登録 (友だち中)。
        if (!userId) return;
        await this.upsertFollower(tenantId, lineAccountId, credentials, userId);
        break;
      }
      case 'unfollow': {
        // ブロック / 友だち削除 → 友だち解除の印を付ける。
        if (!userId) return;
        await this.db
          .update(customers)
          .set({ isFollowing: false, unfollowedAt: new Date(), updatedAt: new Date() })
          .where(and(eq(customers.tenantId, tenantId), eq(customers.lineUserId, userId)));
        break;
      }
      case 'message': {
        const message = (event as webhook.MessageEvent).message;
        if (!userId) return;
        // v0.1 は文字メッセージのみ自動応答。スタンプ・画像等は記録せずスキップ。
        if (message.type !== 'text') {
          this.logger.log(`Non-text message (${message.type}) — skipped (v0.1 text only)`);
          return;
        }
        const text = (message as webhook.TextMessageContent).text;
        // 友だち追加イベントを取りこぼした客でも会話できるよう、受信時にも upsert してから処理。
        const customer = await this.upsertFollower(tenantId, lineAccountId, credentials, userId);
        await this.messagesService.handleInboundMessage(tenantId, customer.id, text);
        break;
      }
      default:
        this.logger.log(`Unhandled webhook event type: ${event.type}`);
    }
  }

  /** プロフィール (表示名/アイコン/ステータス) を取得して顧客を upsert する。 */
  private async upsertFollower(
    tenantId: string,
    lineAccountId: string,
    credentials: LineCredentials,
    lineUserId: string,
  ): Promise<{ id: string }> {
    let displayName: string | undefined;
    let pictureUrl: string | undefined;
    let statusMessage: string | undefined;
    try {
      const profile = await this.lineService.getProfile(credentials, lineUserId);
      displayName = profile.displayName;
      pictureUrl = profile.pictureUrl;
      statusMessage = profile.statusMessage;
    } catch (e) {
      this.logger.warn(
        `getProfile failed for ${lineUserId}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    return this.customersService.upsertByLineUser(tenantId, lineAccountId, lineUserId, {
      displayName,
      pictureUrl,
      statusMessage,
      isFollowing: true,
    });
  }
}
