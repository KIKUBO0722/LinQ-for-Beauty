import { pgTable, uuid, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { reservations } from './reservations';
import { customers } from './customers';

// Phase 2 — stubs only, not used in v0.1

export const treatmentRecords = pgTable('treatment_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  reservationId: uuid('reservation_id').notNull().references(() => reservations.id),
  customerId: uuid('customer_id').references(() => customers.id),
  transcript: text('transcript'),    // AI voice transcription
  summary: text('summary'),          // AI-generated summary
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const aiGeneratedContent = pgTable('ai_generated_content', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: text('type').notNull(),      // 'message', 'reminder', 'analysis'
  input: jsonb('input'),
  output: text('output'),
  model: text('model'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type TreatmentRecord = typeof treatmentRecords.$inferSelect;
export type AiGeneratedContent = typeof aiGeneratedContent.$inferSelect;
