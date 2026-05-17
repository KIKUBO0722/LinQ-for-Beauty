import { relations } from 'drizzle-orm';
import { reservations, personalBlocks, reservationReminders, icsTokens } from './reservations';
import { customers } from './customers';
import { services } from './services';
import { locations } from './locations';
import { tenants } from './tenants';
import { lineAccounts } from './line-accounts';
import { webhookEvents, messages } from './messages';
import { messageTemplates } from './templates';
import { greetingMessages } from './greetings';
import { broadcasts, broadcastStats, blockEvents } from './broadcasts';
import { richMenuGroups, richMenus } from './rich-menus';
import { coupons } from './coupons';

export const reservationsRelations = relations(reservations, ({ one }) => ({
  customers: one(customers, {
    fields: [reservations.customerId],
    references: [customers.id],
  }),
  services: one(services, {
    fields: [reservations.serviceId],
    references: [services.id],
  }),
  locations: one(locations, {
    fields: [reservations.locationId],
    references: [locations.id],
  }),
}));

export const personalBlocksRelations = relations(personalBlocks, ({ one }) => ({
  tenants: one(tenants, {
    fields: [personalBlocks.tenantId],
    references: [tenants.id],
  }),
  locations: one(locations, {
    fields: [personalBlocks.locationId],
    references: [locations.id],
  }),
}));

export const reservationRemindersRelations = relations(reservationReminders, ({ one }) => ({
  reservations: one(reservations, {
    fields: [reservationReminders.reservationId],
    references: [reservations.id],
  }),
}));

export const locationsRelations = relations(locations, ({ one }) => ({
  tenants: one(tenants, {
    fields: [locations.tenantId],
    references: [tenants.id],
  }),
}));

export const servicesRelations = relations(services, ({ one }) => ({
  tenants: one(tenants, {
    fields: [services.tenantId],
    references: [tenants.id],
  }),
}));

export const customersRelations = relations(customers, ({ one }) => ({
  tenants: one(tenants, {
    fields: [customers.tenantId],
    references: [tenants.id],
  }),
}));

export const icsTokensRelations = relations(icsTokens, ({ one }) => ({
  locations: one(locations, {
    fields: [icsTokens.locationId],
    references: [locations.id],
  }),
}));

export const webhookEventsRelations = relations(webhookEvents, ({ one }) => ({
  tenants: one(tenants, { fields: [webhookEvents.tenantId], references: [tenants.id] }),
  locations: one(locations, { fields: [webhookEvents.locationId], references: [locations.id] }),
  lineAccounts: one(lineAccounts, { fields: [webhookEvents.lineAccountId], references: [lineAccounts.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  tenants: one(tenants, { fields: [messages.tenantId], references: [tenants.id] }),
  locations: one(locations, { fields: [messages.locationId], references: [locations.id] }),
  lineAccounts: one(lineAccounts, { fields: [messages.lineAccountId], references: [lineAccounts.id] }),
  customers: one(customers, { fields: [messages.customerId], references: [customers.id] }),
  broadcasts: one(broadcasts, { fields: [messages.broadcastId], references: [broadcasts.id] }),
}));

export const messageTemplatesRelations = relations(messageTemplates, ({ one }) => ({
  tenants: one(tenants, { fields: [messageTemplates.tenantId], references: [tenants.id] }),
  locations: one(locations, { fields: [messageTemplates.locationId], references: [locations.id] }),
}));

export const greetingMessagesRelations = relations(greetingMessages, ({ one }) => ({
  tenants: one(tenants, { fields: [greetingMessages.tenantId], references: [tenants.id] }),
  locations: one(locations, { fields: [greetingMessages.locationId], references: [locations.id] }),
}));

export const broadcastsRelations = relations(broadcasts, ({ one, many }) => ({
  tenants: one(tenants, { fields: [broadcasts.tenantId], references: [tenants.id] }),
  locations: one(locations, { fields: [broadcasts.locationId], references: [locations.id] }),
  stats: one(broadcastStats, { fields: [broadcasts.id], references: [broadcastStats.broadcastId] }),
  messages: many(messages),
}));

export const broadcastStatsRelations = relations(broadcastStats, ({ one }) => ({
  broadcast: one(broadcasts, { fields: [broadcastStats.broadcastId], references: [broadcasts.id] }),
}));

export const blockEventsRelations = relations(blockEvents, ({ one }) => ({
  tenants: one(tenants, { fields: [blockEvents.tenantId], references: [tenants.id] }),
  locations: one(locations, { fields: [blockEvents.locationId], references: [locations.id] }),
  customers: one(customers, { fields: [blockEvents.customerId], references: [customers.id] }),
  lastBroadcast: one(broadcasts, { fields: [blockEvents.lastBroadcastId], references: [broadcasts.id] }),
}));

export const richMenuGroupsRelations = relations(richMenuGroups, ({ one, many }) => ({
  tenants: one(tenants, { fields: [richMenuGroups.tenantId], references: [tenants.id] }),
  locations: one(locations, { fields: [richMenuGroups.locationId], references: [locations.id] }),
  lineAccounts: one(lineAccounts, { fields: [richMenuGroups.lineAccountId], references: [lineAccounts.id] }),
  richMenus: many(richMenus),
}));

export const richMenusRelations = relations(richMenus, ({ one }) => ({
  tenants: one(tenants, { fields: [richMenus.tenantId], references: [tenants.id] }),
  locations: one(locations, { fields: [richMenus.locationId], references: [locations.id] }),
  lineAccounts: one(lineAccounts, { fields: [richMenus.lineAccountId], references: [lineAccounts.id] }),
  group: one(richMenuGroups, { fields: [richMenus.groupId], references: [richMenuGroups.id] }),
}));

export const couponsRelations = relations(coupons, ({ one }) => ({
  tenants: one(tenants, { fields: [coupons.tenantId], references: [tenants.id] }),
  locations: one(locations, { fields: [coupons.locationId], references: [locations.id] }),
}));
