import { pgTable, uuid, text, boolean, jsonb, timestamp, varchar } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export type DayHours = { open: string; close: string };
export type BusinessHours = {
  mon?: DayHours;
  tue?: DayHours;
  wed?: DayHours;
  thu?: DayHours;
  fri?: DayHours;
  sat?: DayHours;
  sun?: DayHours;
};

// 0=日, 1=月, ..., 6=土
export type ClosedDays = number[];

export const locations = pgTable('locations', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  address: text('address'),
  phone: text('phone'), // 拠点の電話番号
  businessHours: jsonb('business_hours').$type<BusinessHours>(),
  closedDays: jsonb('closed_days').$type<ClosedDays>().default([]), // 定休日 (曜日番号配列)
  themeColor: varchar('theme_color', { length: 7 }), // 拠点別配色 (= 16 進カラーコード "#06c755")
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
