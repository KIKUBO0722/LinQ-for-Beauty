import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const lineAccounts = pgTable('line_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  channelId: text('channel_id').notNull(),
  channelSecret: text('channel_secret').notNull(),
  channelAccessToken: text('channel_access_token').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type LineAccount = typeof lineAccounts.$inferSelect;
export type NewLineAccount = typeof lineAccounts.$inferInsert;
