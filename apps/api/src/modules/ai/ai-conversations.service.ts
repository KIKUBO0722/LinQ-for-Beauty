import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import { aiConversations, customers } from '@linq-beauty/db';
import { DB } from '../../database/database.module';
import type { AiMessage } from '@linq-beauty/db';

type Db = NodePgDatabase<typeof schema>;
type ConvRow = typeof aiConversations.$inferSelect;

export type ConversationWithCustomer = ConvRow & {
  customerName: string | null;
  customerDisplayName: string | null;
};

@Injectable()
export class AiConversationsService {
  private readonly logger = new Logger(AiConversationsService.name);

  constructor(@Inject(DB) private readonly db: Db) {}

  async list(tenantId: string): Promise<ConversationWithCustomer[]> {
    // 2 query JS-merge (innerJoin 回避)
    const convs = await this.db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.tenantId, tenantId))
      .orderBy(desc(aiConversations.updatedAt));

    if (convs.length === 0) return [];

    const customerIds = [...new Set(convs.map((c) => c.customerId))];
    const cusRows = await this.db
      .select({ id: customers.id, name: customers.name, displayName: customers.displayName })
      .from(customers)
      .where(eq(customers.tenantId, tenantId));
    const cusMap = new Map(cusRows.map((c) => [c.id, c]));

    return convs.map((c) => {
      const cus = cusMap.get(c.customerId);
      return {
        ...c,
        customerName: cus?.name ?? null,
        customerDisplayName: cus?.displayName ?? null,
      };
    });
  }

  async getForCustomer(tenantId: string, customerId: string): Promise<ConvRow | null> {
    const [row] = await this.db
      .select()
      .from(aiConversations)
      .where(and(eq(aiConversations.tenantId, tenantId), eq(aiConversations.customerId, customerId)))
      .limit(1);
    return row ?? null;
  }

  /** 会話に新メッセージを追加 (Day 10 の auto-reply 経由で呼ばれる、Day 9 では未使用) */
  async appendMessage(
    tenantId: string,
    customerId: string,
    message: AiMessage,
    tokensUsed: number = 0,
  ): Promise<ConvRow> {
    const existing = await this.getForCustomer(tenantId, customerId);
    const messageWithTs = { ...message, ts: message.ts ?? new Date().toISOString() };

    if (!existing) {
      const [created] = await this.db
        .insert(aiConversations)
        .values({
          tenantId,
          customerId,
          messages: [messageWithTs],
          totalTokensUsed: tokensUsed,
        })
        .returning();
      return created;
    }

    const newMessages = [...existing.messages, messageWithTs];
    const [updated] = await this.db
      .update(aiConversations)
      .set({
        messages: newMessages,
        totalTokensUsed: existing.totalTokensUsed + tokensUsed,
        updatedAt: new Date(),
      })
      .where(eq(aiConversations.id, existing.id))
      .returning();
    return updated;
  }
}
