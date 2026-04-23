import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { locations } from './locations';

export const richMenuConfigs = pgTable('rich_menu_configs', {
  id: uuid('id').defaultRandom().primaryKey(),
  locationId: uuid('location_id').notNull().references(() => locations.id, { onDelete: 'cascade' }),
  richMenuId: text('rich_menu_id'),   // LINE side ID after creation
  richMenuGroupId: text('rich_menu_group_id'),
  isActive: boolean('is_active').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type RichMenuConfig = typeof richMenuConfigs.$inferSelect;
export type NewRichMenuConfig = typeof richMenuConfigs.$inferInsert;
