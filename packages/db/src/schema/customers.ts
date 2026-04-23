import { pgTable, uuid, text, date, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { locations } from './locations';

export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  lineUserId: text('line_user_id').unique(),
  name: text('name'),
  phone: text('phone'),
  email: text('email'),
  birthday: date('birthday'),
  notes: text('notes'),
  preferredLocationId: uuid('preferred_location_id').references(() => locations.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
