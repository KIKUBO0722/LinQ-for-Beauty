import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { locations } from './locations';
import { services } from './services';
import { customers } from './customers';

export const reservationStatusEnum = pgEnum('reservation_status', [
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'no_show',
]);

export const reservations = pgTable('reservations', {
  id: uuid('id').defaultRandom().primaryKey(),
  locationId: uuid('location_id').notNull().references(() => locations.id),
  serviceId: uuid('service_id').notNull().references(() => services.id),
  customerId: uuid('customer_id').references(() => customers.id),
  guestName: text('guest_name'),
  guestPhone: text('guest_phone'),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  status: reservationStatusEnum('status').default('pending').notNull(),
  note: text('note'),
  icsExported: timestamp('ics_exported', { withTimezone: true }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const personalBlocks = pgTable('personal_blocks', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id').references(() => locations.id),
  title: text('title').notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const reservationReminders = pgTable('reservation_reminders', {
  id: uuid('id').defaultRandom().primaryKey(),
  reservationId: uuid('reservation_id').notNull().references(() => reservations.id, { onDelete: 'cascade' }),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  type: text('type').notNull(),  // '24h', '1h'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const icsTokens = pgTable('ics_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  locationId: uuid('location_id').references(() => locations.id),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Reservation = typeof reservations.$inferSelect;
export type NewReservation = typeof reservations.$inferInsert;
export type PersonalBlock = typeof personalBlocks.$inferSelect;
export type NewPersonalBlock = typeof personalBlocks.$inferInsert;
