import { pgTable, uuid, text, timestamp, bigserial, varchar, jsonb, index } from 'drizzle-orm/pg-core';

// 08 運営管理パック: 運営者 (platform_admins) と操作記録 (admin_audit_logs)。
// 運営者は店のスタッフ (users) と混ぜない — tenantId を持たない独立の人格 (OWASP/CIS の管理者分離)。
// パスワードリセット・複数運営者の招待は将来 (v0.1 は seed-platform-admin.ts で 1 名 bootstrap)。
export const platformAdmins = pgTable('platform_admins', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 追記専用の監査ログ。actorId はログイン失敗 (actor 不明の試行を含む) を day one で記録するため nullable。
// targetTenantId は意図的に FK を張らない — 監査は履歴であり、tenant 削除で消えても・削除を妨げてもいけない
// (店名は detail に snapshot する)。detail にパスワード平文・ハッシュは絶対に入れない (spec が機械検証)。
export const adminAuditLogs = pgTable(
  'admin_audit_logs',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    actorId: uuid('actor_id').references(() => platformAdmins.id),
    action: varchar('action', { length: 50 }).notNull(),
    targetTenantId: uuid('target_tenant_id'),
    detail: jsonb('detail').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('admin_audit_logs_created_idx').on(table.createdAt),
    index('admin_audit_logs_target_tenant_idx').on(table.targetTenantId),
  ],
);

export type PlatformAdmin = typeof platformAdmins.$inferSelect;
export type NewPlatformAdmin = typeof platformAdmins.$inferInsert;
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type NewAdminAuditLog = typeof adminAuditLogs.$inferInsert;
