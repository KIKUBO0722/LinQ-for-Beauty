import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { locations } from './locations';

export const brandingAssets = pgTable('branding_assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  locationId: uuid('location_id').notNull().references(() => locations.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),   // 'rich_menu_image', 'logo', 'header'
  url: text('url').notNull(),
  primaryColor: text('primary_color'),  // hex
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type BrandingAsset = typeof brandingAssets.$inferSelect;
export type NewBrandingAsset = typeof brandingAssets.$inferInsert;
