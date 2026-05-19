import { pgTable, uuid, varchar, text, jsonb, timestamp, integer } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { locations } from './locations';

export const segments = pgTable('segments', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id').references(() => locations.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  tagIds: jsonb('tag_ids').$type<string[]>().notNull().default([]),
  matchType: varchar('match_type', { length: 10 }).notNull().default('any'),
  excludeTagIds: jsonb('exclude_tag_ids').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Segment = typeof segments.$inferSelect;
export type NewSegment = typeof segments.$inferInsert;

export const segmentBroadcasts = pgTable('segment_broadcasts', {
  id: uuid('id').defaultRandom().primaryKey(),
  segmentId: uuid('segment_id')
    .notNull()
    .references(() => segments.id, { onDelete: 'cascade' }),
  message: text('message').notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
  recipientCount: integer('recipient_count').notNull().default(0),
  sentCount: integer('sent_count').notNull().default(0),
});

export type SegmentBroadcast = typeof segmentBroadcasts.$inferSelect;
export type NewSegmentBroadcast = typeof segmentBroadcasts.$inferInsert;
