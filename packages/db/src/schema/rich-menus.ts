import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  boolean,
  timestamp,
  integer,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { locations } from './locations';
import { lineAccounts } from './line-accounts';

export const richMenuGroups = pgTable('rich_menu_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id').references(() => locations.id, { onDelete: 'set null' }),
  lineAccountId: uuid('line_account_id')
    .notNull()
    .references(() => lineAccounts.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const richMenus = pgTable('rich_menus', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id').references(() => locations.id, { onDelete: 'set null' }),
  lineAccountId: uuid('line_account_id')
    .notNull()
    .references(() => lineAccounts.id, { onDelete: 'cascade' }),
  lineRichMenuId: varchar('line_rich_menu_id', { length: 255 }),
  name: varchar('name', { length: 255 }).notNull(),
  chatBarText: varchar('chat_bar_text', { length: 255 }),
  size: jsonb('size'),
  areas: jsonb('areas'),
  imageUrl: varchar('image_url', { length: 512 }),
  isDefault: boolean('is_default').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  groupId: uuid('group_id').references(() => richMenuGroups.id, { onDelete: 'set null' }),
  tabIndex: integer('tab_index'),
  lineAliasId: varchar('line_alias_id', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type RichMenuGroup = typeof richMenuGroups.$inferSelect;
export type NewRichMenuGroup = typeof richMenuGroups.$inferInsert;
export type RichMenu = typeof richMenus.$inferSelect;
export type NewRichMenu = typeof richMenus.$inferInsert;
