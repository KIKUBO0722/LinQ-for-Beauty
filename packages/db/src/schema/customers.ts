import { pgTable, uuid, text, date, timestamp, varchar, boolean, integer, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { locations } from './locations';
import { lineAccounts } from './line-accounts';

export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  lineAccountId: uuid('line_account_id').references(() => lineAccounts.id, { onDelete: 'set null' }),
  lineUserId: text('line_user_id').unique(),
  name: text('name'),
  displayName: varchar('display_name', { length: 255 }),
  pictureUrl: varchar('picture_url', { length: 512 }),
  statusMessage: varchar('status_message', { length: 500 }),
  language: varchar('language', { length: 10 }),
  phone: text('phone'),
  email: text('email'),
  birthday: date('birthday'),
  notes: text('notes'),
  preferredLocationId: uuid('preferred_location_id').references(() => locations.id),
  // エンゲージメント・LINE 状態
  isFollowing: boolean('is_following').notNull().default(true),
  score: integer('score').notNull().default(0),
  customFields: jsonb('custom_fields').default({}),
  acquisitionSource: varchar('acquisition_source', { length: 50 }),
  chatStatus: varchar('chat_status', { length: 20 }).notNull().default('unread'),
  engagementTier: varchar('engagement_tier', { length: 10 }).notNull().default('unknown'),
  followedAt: timestamp('followed_at', { withTimezone: true }),
  unfollowedAt: timestamp('unfollowed_at', { withTimezone: true }),
  profileSyncedAt: timestamp('profile_synced_at', { withTimezone: true }),
  lastInteractionAt: timestamp('last_interaction_at', { withTimezone: true }),
  lastReadAt: timestamp('last_read_at', { withTimezone: true }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
