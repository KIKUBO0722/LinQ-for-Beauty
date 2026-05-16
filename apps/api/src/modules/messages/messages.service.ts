import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import { messages, customers, lineAccounts } from '@linq-beauty/db';
import { DB } from '../../database/database.module';
import { LineService, type LineCredentials, type LineMessage } from '../line/line.service';
import type { MessagePayload } from './dto/messages.dto';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly lineService: LineService,
  ) {}

  private async getTenantLineAccount(tenantId: string) {
    const [account] = await this.db
      .select()
      .from(lineAccounts)
      .where(eq(lineAccounts.tenantId, tenantId))
      .limit(1);
    if (!account) throw new NotFoundException('LINE account not registered for tenant');
    return account;
  }

  async getThreads(tenantId: string, locationId?: string) {
    const locFilter = locationId ? sql`AND m.location_id = ${locationId}` : sql``;
    const result = await this.db.execute(sql`
      WITH thread_agg AS (
        SELECT
          m.customer_id,
          MAX(m.created_at) AS last_message_at,
          COUNT(*) FILTER (
            WHERE m.direction = 'inbound'
              AND (c.last_read_at IS NULL OR m.created_at > c.last_read_at)
          )::int AS unread_count
        FROM messages m
        INNER JOIN customers c ON c.id = m.customer_id
        WHERE m.tenant_id = ${tenantId}
          AND m.customer_id IS NOT NULL
          ${locFilter}
        GROUP BY m.customer_id
      )
      SELECT
        t.customer_id,
        t.last_message_at,
        t.unread_count,
        c.name AS customer_name,
        c.line_user_id,
        c.preferred_location_id,
        c.last_read_at,
        (
          SELECT m2.content FROM messages m2
          WHERE m2.customer_id = t.customer_id
            AND m2.tenant_id = ${tenantId}
          ORDER BY m2.created_at DESC LIMIT 1
        ) AS last_message_content,
        (
          SELECT m2.direction FROM messages m2
          WHERE m2.customer_id = t.customer_id
            AND m2.tenant_id = ${tenantId}
          ORDER BY m2.created_at DESC LIMIT 1
        ) AS last_message_direction
      FROM thread_agg t
      INNER JOIN customers c ON c.id = t.customer_id
      ORDER BY t.last_message_at DESC
      LIMIT 200
    `);
    const rows =
      (result as { rows?: Array<Record<string, unknown>> }).rows ??
      (result as unknown as Array<Record<string, unknown>>);
    return rows.map((row) => {
      const rawContent = row.last_message_content;
      let lastMessage: unknown = null;
      try {
        lastMessage = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
      } catch {
        lastMessage = rawContent;
      }
      const lastAt = row.last_message_at;
      return {
        customerId: row.customer_id as string,
        customerName: (row.customer_name as string | null) ?? null,
        lineUserId: (row.line_user_id as string | null) ?? null,
        preferredLocationId: (row.preferred_location_id as string | null) ?? null,
        lastReadAt: (row.last_read_at as string | Date | null) ?? null,
        unreadCount: Number(row.unread_count ?? 0),
        lastMessage,
        lastMessageDirection: (row.last_message_direction as 'inbound' | 'outbound' | null) ?? null,
        lastMessageAt:
          lastAt instanceof Date
            ? lastAt.toISOString()
            : typeof lastAt === 'string'
              ? lastAt
              : null,
      };
    });
  }

  async getConversation(tenantId: string, customerId: string, locationId?: string) {
    return this.db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.tenantId, tenantId),
          eq(messages.customerId, customerId),
          locationId ? eq(messages.locationId, locationId) : undefined,
        ),
      )
      .orderBy(desc(messages.createdAt))
      .limit(100);
  }

  async markAsRead(tenantId: string, customerId: string) {
    try {
      await this.db
        .update(customers)
        .set({ lastReadAt: new Date(), updatedAt: new Date() })
        .where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)));
    } catch (error) {
      this.logger.error(`Failed to markAsRead ${customerId}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async getUnreadSummary(tenantId: string, locationId?: string) {
    const locFilter = locationId ? sql`AND m.location_id = ${locationId}` : sql``;
    const result = await this.db.execute(sql<{
      customer_id: string;
      unread_count: number;
      last_message_content: unknown;
      last_message_created_at: string | Date;
    }>`
      SELECT
        m.customer_id,
        COUNT(m.id)::int AS unread_count,
        (
          SELECT m2.content FROM messages m2
          WHERE m2.customer_id = m.customer_id
            AND m2.tenant_id = ${tenantId}
            AND m2.direction = 'inbound'
            AND (c.last_read_at IS NULL OR m2.created_at > c.last_read_at)
          ORDER BY m2.created_at DESC LIMIT 1
        ) AS last_message_content,
        MAX(m.created_at) AS last_message_created_at
      FROM messages m
      INNER JOIN customers c ON c.id = m.customer_id
      WHERE m.tenant_id = ${tenantId}
        AND m.direction = 'inbound'
        AND (c.last_read_at IS NULL OR m.created_at > c.last_read_at)
        ${locFilter}
      GROUP BY m.customer_id, c.last_read_at
    `);

    const rows = (result as { rows?: Array<Record<string, unknown>> }).rows ?? (result as unknown as Array<Record<string, unknown>>);

    let totalUnread = 0;
    const unreadCustomers: Array<{
      customerId: string;
      unreadCount: number;
      lastMessage: unknown;
      createdAt: string;
    }> = [];

    for (const row of rows) {
      const customerId = row.customer_id as string | null;
      if (!customerId) continue;
      const cnt = Number(row.unread_count);
      totalUnread += cnt;
      const rawContent = row.last_message_content;
      let lastMessage: unknown = null;
      try {
        lastMessage = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
      } catch {
        lastMessage = rawContent;
      }
      const createdAtRaw = row.last_message_created_at;
      const createdAt =
        createdAtRaw instanceof Date
          ? createdAtRaw.toISOString()
          : typeof createdAtRaw === 'string'
            ? createdAtRaw
            : '';
      unreadCustomers.push({ customerId, unreadCount: cnt, lastMessage, createdAt });
    }

    return { totalUnread, unreadCustomers };
  }

  async sendToCustomer(tenantId: string, customerId: string, text: string) {
    return this.sendMessageToCustomer(tenantId, customerId, { type: 'text', text });
  }

  async sendMessageToCustomer(
    tenantId: string,
    customerId: string,
    payload: MessagePayload,
  ) {
    const [customer] = await this.db
      .select()
      .from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
      .limit(1);

    if (!customer) throw new NotFoundException('Customer not found');
    if (!customer.lineUserId) throw new BadRequestException('Customer has no LINE userId');

    const account = await this.getTenantLineAccount(tenantId);

    const lineMessage = this.buildLineMessage(payload);
    const credentials: LineCredentials = {
      channelSecret: account.channelSecret,
      channelAccessToken: account.channelAccessToken,
    };

    // LINE 送信は失敗しても DB insert は続行する (broadcasts と挙動を揃える)
    // — dummy account / 未接続 / レート制限などは status='failed' で記録、画面には追加される
    let sendStatus: 'sent' | 'failed' = 'sent';
    try {
      await this.lineService.pushMessage(credentials, customer.lineUserId, [lineMessage]);
    } catch (e) {
      sendStatus = 'failed';
      this.logger.warn(
        `LINE push failed for customer=${customerId}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    const [msg] = await this.db
      .insert(messages)
      .values({
        tenantId,
        locationId: customer.preferredLocationId,
        lineAccountId: account.id,
        customerId,
        direction: 'outbound',
        messageType: payload.type,
        content: lineMessage as unknown as Record<string, unknown>,
        sendType: 'push',
        status: sendStatus,
        sentAt: new Date(),
      })
      .returning();

    return msg;
  }

  async testSend(tenantId: string, customerIds: string[], text: string) {
    const account = await this.getTenantLineAccount(tenantId);
    const credentials: LineCredentials = {
      channelSecret: account.channelSecret,
      channelAccessToken: account.channelAccessToken,
    };

    let sent = 0;
    for (const customerId of customerIds) {
      const [customer] = await this.db
        .select()
        .from(customers)
        .where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
        .limit(1);
      if (!customer?.lineUserId) continue;
      try {
        await this.lineService.pushMessage(credentials, customer.lineUserId, [
          { type: 'text', text },
        ]);
        sent++;
      } catch (error) {
        this.logger.error(
          `testSend failed for customer ${customerId}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    return { sent };
  }

  private buildLineMessage(payload: MessagePayload): LineMessage {
    switch (payload.type) {
      case 'text':
        if (!payload.text) throw new BadRequestException('text required');
        return this.attachQuickReply({ type: 'text', text: payload.text }, payload);
      case 'image':
        if (!payload.originalContentUrl)
          throw new BadRequestException('originalContentUrl required');
        return this.attachQuickReply(
          {
            type: 'image',
            originalContentUrl: payload.originalContentUrl,
            previewImageUrl: payload.previewImageUrl || payload.originalContentUrl,
          },
          payload,
        );
      case 'video':
        if (!payload.originalContentUrl || !payload.previewImageUrl)
          throw new BadRequestException('originalContentUrl + previewImageUrl required');
        return this.attachQuickReply(
          {
            type: 'video',
            originalContentUrl: payload.originalContentUrl,
            previewImageUrl: payload.previewImageUrl,
          },
          payload,
        );
      case 'audio':
        if (!payload.originalContentUrl)
          throw new BadRequestException('originalContentUrl required');
        return this.attachQuickReply(
          {
            type: 'audio',
            originalContentUrl: payload.originalContentUrl,
            duration: payload.duration || 60000,
          },
          payload,
        );
      case 'flex':
        if (!payload.contents) throw new BadRequestException('contents required');
        return this.attachQuickReply(
          {
            type: 'flex',
            altText: payload.altText || 'メッセージ',
            contents: payload.contents as never,
          },
          payload,
        );
      default:
        throw new BadRequestException(`Unsupported message type: ${(payload as MessagePayload).type}`);
    }
  }

  private attachQuickReply(message: LineMessage, payload: MessagePayload): LineMessage {
    if (payload.quickReply?.items?.length) {
      (message as Record<string, unknown>).quickReply = payload.quickReply;
    }
    return message;
  }
}
