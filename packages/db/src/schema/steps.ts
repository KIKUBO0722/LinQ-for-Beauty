import { pgTable, uuid, varchar, integer, boolean, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { locations } from './locations';
import { customers } from './customers';

// Day 12/22: 順番に時間差で送るメッセージ (ステップ配信)
// オリジナル LinQ steps.ts をベースに、friend → customer、locationId 追加、トリガー種別を美容版で拡張

export type StepTriggerType =
  | 'manual'              // 手動で顧客を追加
  | 'tag'                 // タグ付与時
  | 'form'                // カウンセリングシート回答時
  | 'friend-add'          // LINE 友だち追加時
  | 'reservation-completed'; // 美容版独自: 来店完了時 (Day 13 で結線)

export const stepScenarios = pgTable('step_scenarios', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id').references(() => locations.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 1000 }),
  triggerType: varchar('trigger_type', { length: 30 }).notNull(),
  // triggerConfig: tag → { tagId } / form → { formId } / reservation-completed → { serviceId, daysAfter }
  triggerConfig: jsonb('trigger_config').$type<Record<string, unknown>>().default({}),
  isActive: boolean('is_active').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const stepMessages = pgTable('step_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  scenarioId: uuid('scenario_id')
    .notNull()
    .references(() => stepScenarios.id, { onDelete: 'cascade' }),
  // 前ステップからの遅延 (分)、初回は enrolledAt からの遅延
  delayMinutes: integer('delay_minutes').notNull().default(0),
  // 条件分岐 (Phase 2 候補、Day 12 は列のみ用意、UI は線形のみ)
  condition: jsonb('condition').$type<Record<string, unknown> | null>(),
  branchTrue: integer('branch_true'),
  branchFalse: integer('branch_false'),
  messageContent: jsonb('message_content').$type<StepMessageContent>().notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type StepMessageContent =
  | { type: 'text'; text: string }
  | { type: 'image'; originalContentUrl: string }
  | { type: string; [k: string]: unknown };

export const stepEnrollments = pgTable(
  'step_enrollments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    scenarioId: uuid('scenario_id')
      .notNull()
      .references(() => stepScenarios.id, { onDelete: 'cascade' }),
    currentStepIndex: integer('current_step_index').notNull().default(0),
    // active / paused / completed / cancelled
    status: varchar('status', { length: 20 }).notNull().default('active'),
    enrolledAt: timestamp('enrolled_at', { withTimezone: true }).defaultNow().notNull(),
    nextSendAt: timestamp('next_send_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [index('step_enrollments_next_send_idx').on(table.nextSendAt)],
);

export type StepScenario = typeof stepScenarios.$inferSelect;
export type NewStepScenario = typeof stepScenarios.$inferInsert;
export type StepMessage = typeof stepMessages.$inferSelect;
export type NewStepMessage = typeof stepMessages.$inferInsert;
export type StepEnrollment = typeof stepEnrollments.$inferSelect;
export type NewStepEnrollment = typeof stepEnrollments.$inferInsert;
