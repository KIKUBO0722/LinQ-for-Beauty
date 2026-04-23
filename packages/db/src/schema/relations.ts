import { relations } from 'drizzle-orm';
import { reservations, personalBlocks, reservationReminders, icsTokens } from './reservations';
import { customers } from './customers';
import { services } from './services';
import { locations } from './locations';
import { tenants } from './tenants';

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
