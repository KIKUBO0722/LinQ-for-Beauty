import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(), // サロン名 (= 屋号)
  email: text('email').notNull().unique(),
  // 担当者情報 (= サロンオーナーの連絡先、複数オーナー対応は Phase 2)
  ownerName: text('owner_name'), // オーナー名
  ownerRole: text('owner_role'), // 役職 (= 例「店長」「代表」)
  phone: text('phone'), // 連絡先電話
  address: text('address'), // 本社住所 (= 拠点とは別の代表住所)
  lineId: text('line_id'), // オーナー本人の LINE ID (= 緊急連絡用)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
