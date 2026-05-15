import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { locations } from './locations';
import { customers } from './customers';

export const broadcasts = pgTable(
  'broadcasts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    locationId: uuid('location_id').references(() => locations.id, { onDelete: 'set null' }),
    type: varchar('type', { length: 20 }).notNull(),
    segmentId: uuid('segment_id'),
    title: varchar('title', { length: 255 }),
    contentPreview: text('content_preview'),
    messageType: varchar('message_type', { length: 20 }),
    recipientCount: integer('recipient_count').notNull().default(0),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    status: varchar('status', { length: 20 }).notNull().default('sent'),
    autoTagOnResponse: uuid('auto_tag_on_response'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_broadcasts_tenant').on(table.tenantId, table.sentAt),
    index('idx_broadcasts_location').on(table.locationId),
  ],
);

export const broadcastStats = pgTable('broadcast_stats', {
  broadcastId: uuid('broadcast_id')
    .primaryKey()
    .references(() => broadcasts.id, { onDelete: 'cascade' }),
  recipientCount: integer('recipient_count').notNull().default(0),
  responseCount: integer('response_count').notNull().default(0),
  clickCount: integer('click_count').notNull().default(0),
  clickerCount: integer('clicker_count').notNull().default(0),
  blockCount: integer('block_count').notNull().default(0),
  engagementRate: numeric('engagement_rate', { precision: 5, scale: 2 }).default('0'),
  blockRate: numeric('block_rate', { precision: 5, scale: 2 }).default('0'),
  computedAt: timestamp('computed_at', { withTimezone: true }).defaultNow(),
});

export const blockEvents = pgTable(
  'block_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    locationId: uuid('location_id').references(() => locations.id, { onDelete: 'set null' }),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    lineUserId: varchar('line_user_id', { length: 255 }).notNull(),
    lastBroadcastId: uuid('last_broadcast_id').references(() => broadcasts.id, { onDelete: 'set null' }),
    hoursSinceLastMessage: numeric('hours_since_last_message', { precision: 8, scale: 2 }),
    friendAgeDays: integer('friend_age_days'),
    totalMessagesReceived: integer('total_messages_received').notNull().default(0),
    blockedAt: timestamp('blocked_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_block_events_tenant').on(table.tenantId, table.blockedAt),
    index('idx_block_events_location').on(table.locationId),
  ],
);

export type Broadcast = typeof broadcasts.$inferSelect;
export type NewBroadcast = typeof broadcasts.$inferInsert;
export type BroadcastStat = typeof broadcastStats.$inferSelect;
export type NewBroadcastStat = typeof broadcastStats.$inferInsert;
export type BlockEvent = typeof blockEvents.$inferSelect;
export type NewBlockEvent = typeof blockEvents.$inferInsert;
