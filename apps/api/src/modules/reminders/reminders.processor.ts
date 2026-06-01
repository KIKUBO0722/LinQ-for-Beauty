import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import { customers, locations, lineAccounts, reservationReminders } from '@linq-beauty/db';
import { DB } from '../../database/database.module';
import { LineService, type LineCredentials } from '../line/line.service';
import type { ReminderJobData } from './reminders.service';

type Db = NodePgDatabase<typeof schema>;

@Processor('reminders')
export class RemindersProcessor extends WorkerHost {
  private readonly logger = new Logger(RemindersProcessor.name);

  constructor(
    @Inject(DB) private db: Db,
    private lineService: LineService,
  ) {
    super();
  }

  async process(job: Job<ReminderJobData>): Promise<void> {
    const { reminderId, reservationId, customerId, guestName, locationId, startsAt, endsAt, type } = job.data;

    let lineUserId: string | null = null;
    let displayName: string | null = guestName;
    let lineAccountId: string | null = null;
    if (customerId) {
      const customer = await this.db.query.customers.findFirst({
        where: eq(customers.id, customerId),
      });
      lineUserId = customer?.lineUserId ?? null;
      displayName = customer?.name ?? guestName;
      lineAccountId = customer?.lineAccountId ?? null;
    }

    const location = await this.db.query.locations.findFirst({
      where: eq(locations.id, locationId),
    });
    const locationName = location?.name ?? 'サロン';

    const label = type === '24h' ? '24時間' : '1時間';
    const startsJst = new Date(startsAt).toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    const endsJst = new Date(endsAt).toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      hour: '2-digit',
      minute: '2-digit',
    });

    const text =
      `【LinQ for Beauty】${displayName ?? 'お客様'}、ご予約の${label}前です。\n` +
      `予約日時: ${startsJst}〜${endsJst}\n` +
      `${locationName}へのご来店をお待ちしております。`;

    // LINE 未連携の客 / ゲスト予約 → 送りようがないので「送信済み」にはしない。
    if (!lineUserId) {
      this.logger.warn(`No LINE userId for reservation ${reservationId} — reminder not sent`);
      this.logger.log(`[no-LINE] ${text}`);
      return;
    }

    // 店舗 (テナント) ごとの LINE 鍵で送る (一斉配信と同じ仕組み)。
    // env の共有鍵は使わない — 本番では店舗ごとの公式アカウントから送る必要があるため。
    const credentials = await this.resolveCredentials(lineAccountId, location?.tenantId);
    if (!credentials) {
      this.logger.warn(
        `No LINE account for reservation ${reservationId} (tenant ${location?.tenantId ?? 'unknown'}) — reminder not sent`,
      );
      return;
    }

    // 送信が成功したときだけ「送信済み」を記録する。
    // 失敗時は例外が伝播して sentAt を更新しない → 「届かないのに送信済み」を防ぐ。
    await this.lineService.pushMessage(credentials, lineUserId, [{ type: 'text', text }]);
    this.logger.log(`Reminder [${type}] sent to ${lineUserId} for reservation ${reservationId}`);

    await this.db
      .update(reservationReminders)
      .set({ sentAt: new Date() })
      .where(eq(reservationReminders.id, reminderId));
  }

  /**
   * 送信に使う LINE 鍵を解決する。
   * 顧客が紐づく公式アカウント (customer.lineAccountId) を優先し、
   * 無ければ同じ店舗 (テナント) の先頭アカウントで補完する。
   */
  private async resolveCredentials(
    lineAccountId: string | null,
    tenantId: string | undefined,
  ): Promise<LineCredentials | null> {
    let account =
      lineAccountId != null
        ? await this.db.query.lineAccounts.findFirst({
            where: eq(lineAccounts.id, lineAccountId),
          })
        : undefined;

    if (!account && tenantId) {
      account = await this.db.query.lineAccounts.findFirst({
        where: eq(lineAccounts.tenantId, tenantId),
      });
    }

    if (!account) return null;
    return {
      channelSecret: account.channelSecret,
      channelAccessToken: account.channelAccessToken,
    };
  }
}
