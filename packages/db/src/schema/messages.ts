import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  boolean,
  timestamp,
  bigserial,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { locations } from './locations';
import { lineAccounts } from './line-accounts';
import { customers } from './customers';

export const webhookEvents = pgTable(
  'webhook_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    locationId: uuid('location_id').references(() => locations.id, { onDelete: 'set null' }),
    lineAccountId: uuid('line_account_id')
      .notNull()
      .references(() => lineAccounts.id, { onDelete: 'cascade' }),
    eventType: varchar('event_type', { length: 50 }).notNull(),
    lineEventId: varchar('line_event_id', { length: 255 }),
    sourceUserId: varchar('source_user_id', { length: 255 }),
    payload: jsonb('payload').notNull(),
    processed: boolean('processed').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('webhook_events_tenant_created_idx').on(table.tenantId, table.createdAt),
    index('webhook_events_location_idx').on(table.locationId),
    index('webhook_events_line_event_idx').on(table.lineEventId),
  ],
);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    locationId: uuid('location_id').references(() => locations.id, { onDelete: 'set null' }),
    lineAccountId: uuid('line_account_id')
      .notNull()
      .references(() => lineAccounts.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    direction: varchar('direction', { length: 10 }).notNull(),
    messageType: varchar('message_type', { length: 20 }).notNull(),
    content: jsonb('content').notNull(),
    lineMessageId: varchar('line_message_id', { length: 255 }),
    sendType: varchar('send_type', { length: 20 }),
    status: varchar('status', { length: 20 }).notNull().default('sent'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    error: jsonb('error'),
    broadcastId: uuid('broadcast_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('messages_tenant_customer_created_idx').on(
      table.tenantId,
      table.customerId,
      table.createdAt,
    ),
    index('messages_location_idx').on(table.locationId),
    index('idx_messages_broadcast').on(table.broadcastId),
  ],
);

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
