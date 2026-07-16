import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

// v0.1a (監査 6③ 前倒し): 管理画面ログイン用ユーザー
// 単一オーナー前提の最小構成 — パスワードリセット・招待・ロールは Phase 3
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('users_tenant_idx').on(table.tenantId)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
