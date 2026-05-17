import { pgTable, uuid, varchar, timestamp, uniqueIndex, primaryKey } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { customers } from './customers';

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    // 業界分類: 'treatment' / 'status' / 'segment' / 'location' / null (自由タグ)
    category: varchar('category', { length: 20 }),
    name: varchar('name', { length: 100 }).notNull(),
    color: varchar('color', { length: 7 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('tags_tenant_name_idx').on(table.tenantId, table.name)],
);

export const customerTags = pgTable(
  'customer_tags',
  {
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.customerId, table.tagId] })],
);

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type CustomerTag = typeof customerTags.$inferSelect;
