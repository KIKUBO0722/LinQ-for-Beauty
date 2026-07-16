import { pgTable, uuid, varchar, text, boolean, integer, jsonb, timestamp, date, primaryKey } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { customers } from './customers';

// Day 9/22: AI 自動応答 + ナレッジ
// オリジナル LinQ ai.ts + ai-knowledge.ts を美容版に移植、friendId → customerId、ナレッジはテナント別

export const aiConfigs = pgTable('ai_configs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' })
    .unique(), // 1 テナント 1 設定
  systemPrompt: varchar('system_prompt', { length: 5000 }),
  model: varchar('model', { length: 50 }).notNull().default('claude-haiku-4-5-20251001'),
  // temperature は integer 7 → 0.7 として扱う (10 倍格納で小数点回避)
  temperature: integer('temperature').notNull().default(7),
  maxTokens: integer('max_tokens').notNull().default(1024),
  welcomeMessage: varchar('welcome_message', { length: 2000 }),
  autoReplyEnabled: boolean('auto_reply_enabled').notNull().default(false),
  // 会話を人間に引き継ぐキーワード (例: 予約 / アレルギー / クレーム / 返金)
  handoffKeywords: jsonb('handoff_keywords').$type<string[]>().default([]),
  // キーワード応答ルール (Day 10 で本格利用、Day 9 では空配列でセット)
  keywordRules: jsonb('keyword_rules').$type<KeywordRule[]>().default([]),
  // v0.1a: テナント別 AI 日次上限 (Anthropic 課金暴走の防止。0 は使わない — 無効化は autoReplyEnabled で)
  dailyLimit: integer('daily_limit').notNull().default(200),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// v0.1a: AI 利用の日次カウンタ (usage_date はサーバー TZ=Asia/Tokyo 保証下で YYYY-MM-DD 生成)
// 日付が変われば新行になるため日次リセットの cron は不要。超過後もカウントは進める (需要の記録)
export const aiUsageDaily = pgTable(
  'ai_usage_daily',
  {
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    usageDate: date('usage_date').notNull(),
    count: integer('count').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.tenantId, table.usageDate] })],
);

export type KeywordRule = {
  keyword: string;
  response: string;
  matchType?: 'contains' | 'exact' | 'startsWith';
};

export const aiConversations = pgTable('ai_conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  // 直近の会話を直列で持つ (Claude API messages 形式: { role, content })
  messages: jsonb('messages').$type<AiMessage[]>().notNull().default([]),
  totalTokensUsed: integer('total_tokens_used').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type AiMessage = { role: 'user' | 'assistant'; content: string; ts?: string };

// テナント別 FAQ ナレッジ (営業時間 / アクセス / メニュー / よくある質問 等)
export const aiKnowledge = pgTable('ai_knowledge', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  category: varchar('category', { length: 100 }).notNull(), // hours / access / menu / faq / policy / other
  title: varchar('title', { length: 300 }).notNull(),
  content: text('content').notNull(),
  tags: jsonb('tags').$type<string[]>().default([]),
  useCount: integer('use_count').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type AiConfig = typeof aiConfigs.$inferSelect;
export type NewAiConfig = typeof aiConfigs.$inferInsert;
export type AiConversation = typeof aiConversations.$inferSelect;
export type NewAiConversation = typeof aiConversations.$inferInsert;
export type AiKnowledge = typeof aiKnowledge.$inferSelect;
export type NewAiKnowledge = typeof aiKnowledge.$inferInsert;
export type AiUsageDaily = typeof aiUsageDaily.$inferSelect;
export type NewAiUsageDaily = typeof aiUsageDaily.$inferInsert;
