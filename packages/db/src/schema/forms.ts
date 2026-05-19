import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { locations } from './locations';
import { customers } from './customers';

// Form field types (= 項目タイプ 6 種)
export type FormFieldType =
  | 'short_text'
  | 'long_text'
  | 'single_choice'
  | 'multi_choice'
  | 'date'
  | 'image';

// Single field schema (in forms.fields jsonb array)
export type FormField = {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  helperText?: string; // 顧客向け補足説明
  placeholder?: string; // 入力例 (= 「例: 山田 花子」など)
  options?: string[]; // for single_choice / multi_choice
  // 条件分岐: showIf があれば、他項目の回答に応じて表示/非表示
  // - mode 'equals' (デフォルト): 指定値と一致する時に表示 (single_choice / multi_choice 向け)
  // - mode 'answered': 回答があれば表示 (全項目対象)
  // - mode 'empty': 回答が空なら表示 (全項目対象)
  showIf?: {
    fieldId: string;
    mode?: 'equals' | 'answered' | 'empty';
    equals?: string | string[];
  };
};

export const forms = pgTable('forms', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id').references(() => locations.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 200 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(), // 公開 URL に使う英数字
  category: varchar('category', { length: 50 }), // 業種: hair_salon / nail / esthetic / eyelash / hair_removal / chiro / custom
  description: text('description'),
  fields: jsonb('fields').notNull().default([]).$type<FormField[]>(),
  autoTagIds: jsonb('auto_tag_ids').notNull().default([]).$type<string[]>(), // 回答後に自動付与するタグ ID
  thankYouMessage: text('thank_you_message'),
  isPublished: boolean('is_published').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const formResponses = pgTable('form_responses', {
  id: uuid('id').defaultRandom().primaryKey(),
  formId: uuid('form_id').notNull().references(() => forms.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  lineUserId: varchar('line_user_id', { length: 100 }),
  answers: jsonb('answers').notNull().$type<Record<string, string | string[]>>(), // { fieldId: 回答 }
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Form = typeof forms.$inferSelect;
export type NewForm = typeof forms.$inferInsert;
export type FormResponse = typeof formResponses.$inferSelect;
export type NewFormResponse = typeof formResponses.$inferInsert;
