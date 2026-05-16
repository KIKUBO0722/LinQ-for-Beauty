import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { and, desc, eq, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import { broadcasts, broadcastStats, lineAccounts, messages } from '@linq-beauty/db';
import { DB } from '../../database/database.module';
import { LineService, type LineCredentials } from '../line/line.service';
import type { CreateBroadcastDto, UpdateBroadcastDto } from './dto/broadcasts.dto';

type Db = NodePgDatabase<typeof schema>;

export interface BroadcastJobData {
  broadcastId: string;
  tenantId: string;
}

@Injectable()
export class BroadcastsService {
  private readonly logger = new Logger(BroadcastsService.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    @InjectQueue('broadcasts') private readonly queue: Queue,
    private readonly lineService: LineService,
  ) {}

  async list(tenantId: string, locationId?: string) {
    // broadcasts と broadcastStats を別クエリで取得して JS 側で merge する。
    // (drizzle-orm の dual-package 型問題で leftJoin が型エラーを起こすため、
    //  messages.threads と同じく 2 クエリ方式で回避)
    // v0.1 では集計バッチ未実装のため stats は 0 のまま → UI 側で "—" 表示。
    const rows = await this.db
      .select()
      .from(broadcasts)
      .where(
        and(
          eq(broadcasts.tenantId, tenantId),
          locationId ? eq(broadcasts.locationId, locationId) : undefined,
        ),
      )
      .orderBy(desc(broadcasts.createdAt))
      .limit(100);

    if (rows.length === 0) return [];

    const broadcastIds = rows.map((r) => r.id);
    const stats = await this.db
      .select()
      .from(broadcastStats)
      .where(inArray(broadcastStats.broadcastId, broadcastIds));

    const statsMap = new Map(stats.map((s) => [s.broadcastId, s]));

    return rows.map((r) => {
      const s = statsMap.get(r.id);
      return {
        ...r,
        openCount: s?.responseCount ?? null,
        clickCount: s?.clickCount ?? null,
      };
    });
  }

  async get(tenantId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(broadcasts)
      .where(and(eq(broadcasts.id, id), eq(broadcasts.tenantId, tenantId)))
      .limit(1);
    if (!row) throw new NotFoundException('Broadcast not found');
    return row;
  }

  async create(tenantId: string, body: CreateBroadcastDto, locationId?: string) {
    if (!body.text) throw new BadRequestException('text required');
    const messageType = body.messageType || 'text';
    const contentPreview =
      body.text.length > 100 ? body.text.slice(0, 100) + '...' : body.text;

    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    const status: 'scheduled' | 'sent' =
      scheduledAt && scheduledAt.getTime() > Date.now() ? 'scheduled' : 'sent';

    try {
      const [created] = await this.db
        .insert(broadcasts)
        .values({
          tenantId,
          locationId: locationId ?? null,
          type: body.type,
          title: body.title || (status === 'scheduled' ? '予約配信' : '全体配信'),
          contentPreview,
          messageType,
          recipientCount: 0,
          sentAt: status === 'sent' ? new Date() : null,
          scheduledAt,
          status,
          segmentId: body.segmentId ?? null,
          autoTagOnResponse: body.autoTagOnResponse ?? null,
        })
        .returning();

      await this.db
        .insert(broadcastStats)
        .values({ broadcastId: created.id })
        .onConflictDoNothing();

      if (status === 'scheduled' && scheduledAt) {
        const delay = scheduledAt.getTime() - Date.now();
        await this.enqueueBroadcastJob(created.id, tenantId, delay);
      } else {
        await this.executeBroadcast(created.id, tenantId, body.text);
      }

      return created;
    } catch (error) {
      this.logger.error(`Failed to create broadcast: ${error}`);
      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async update(tenantId: string, id: string, body: UpdateBroadcastDto) {
    const values: Record<string, unknown> = {};
    if (body.title !== undefined) values.title = body.title;
    if (body.text !== undefined) {
      values.contentPreview =
        body.text.length > 100 ? body.text.slice(0, 100) + '...' : body.text;
    }
    if (body.scheduledAt !== undefined) values.scheduledAt = new Date(body.scheduledAt);
    if (body.status !== undefined) values.status = body.status;

    if (Object.keys(values).length === 0) return this.get(tenantId, id);

    const [updated] = await this.db
      .update(broadcasts)
      .set(values)
      .where(and(eq(broadcasts.id, id), eq(broadcasts.tenantId, tenantId)))
      .returning();
    if (!updated) throw new NotFoundException('Broadcast not found');
    return updated;
  }

  async cancel(tenantId: string, id: string) {
    const broadcast = await this.get(tenantId, id);
    if (broadcast.status !== 'scheduled') {
      throw new BadRequestException('Only scheduled broadcasts can be cancelled');
    }
    const [updated] = await this.db
      .update(broadcasts)
      .set({ status: 'cancelled' })
      .where(and(eq(broadcasts.id, id), eq(broadcasts.tenantId, tenantId)))
      .returning();
    return updated;
  }

  private async enqueueBroadcastJob(broadcastId: string, tenantId: string, delay: number) {
    try {
      await this.queue.add(
        'send-broadcast',
        { broadcastId, tenantId } satisfies BroadcastJobData,
        { delay: Math.max(delay, 0), removeOnComplete: true, removeOnFail: false },
      );
    } catch (error) {
      this.logger.warn(
        `BullMQ enqueue failed (Redis may be down) for broadcast ${broadcastId}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  async executeBroadcast(broadcastId: string, tenantId: string, text: string) {
    const accounts = await this.db
      .select()
      .from(lineAccounts)
      .where(eq(lineAccounts.tenantId, tenantId));

    if (accounts.length === 0) {
      this.logger.warn(`No LINE accounts for tenant ${tenantId}, broadcast ${broadcastId} skipped`);
      return { sent: 0 };
    }

    let sentCount = 0;
    for (const account of accounts) {
      const credentials: LineCredentials = {
        channelSecret: account.channelSecret,
        channelAccessToken: account.channelAccessToken,
      };
      try {
        await this.lineService.broadcast(credentials, [{ type: 'text', text }]);
        sentCount++;
      } catch (error) {
        this.logger.error(
          `LINE broadcast failed for account ${account.id}: ${error instanceof Error ? error.message : error}`,
        );
      }

      await this.db.insert(messages).values({
        tenantId,
        lineAccountId: account.id,
        direction: 'outbound',
        messageType: 'text',
        content: { type: 'text', text },
        sendType: 'broadcast',
        status: 'sent',
        sentAt: new Date(),
        broadcastId,
      });
    }

    await this.db
      .update(broadcasts)
      .set({ status: 'sent', sentAt: new Date() })
      .where(eq(broadcasts.id, broadcastId));

    return { sent: sentCount };
  }
}
