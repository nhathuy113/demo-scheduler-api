import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const dealerships = pgTable('dealerships', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: text('name').notNull(),
  address: text('address'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const serviceBays = pgTable('service_bays', {
  id: varchar('id', { length: 64 }).primaryKey(),
  dealershipId: varchar('dealership_id', { length: 64 })
    .notNull()
    .references(() => dealerships.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  bayType: varchar('bay_type', { length: 32 }).default('GENERAL').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});

export const technicians = pgTable('technicians', {
  id: varchar('id', { length: 64 }).primaryKey(),
  dealershipId: varchar('dealership_id', { length: 64 })
    .notNull()
    .references(() => dealerships.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});

export const technicianSkills = pgTable('technician_skills', {
  technicianId: varchar('technician_id', { length: 64 })
    .notNull()
    .references(() => technicians.id, { onDelete: 'cascade' }),
  skillCode: varchar('skill_code', { length: 64 }).notNull(),
  certifiedAt: timestamp('certified_at', { withTimezone: true }).defaultNow().notNull(),
});

export const serviceTypes = pgTable('service_types', {
  code: varchar('code', { length: 64 }).primaryKey(),
  name: text('name').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
});

export const serviceRequiredSkills = pgTable('service_required_skills', {
  serviceTypeCode: varchar('service_type_code', { length: 64 })
    .notNull()
    .references(() => serviceTypes.code, { onDelete: 'cascade' }),
  skillCode: varchar('skill_code', { length: 64 }).notNull(),
});

export const appointments = pgTable('appointments', {
  id: varchar('id', { length: 64 }).primaryKey(),
  dealershipId: varchar('dealership_id', { length: 64 })
    .notNull()
    .references(() => dealerships.id, { onDelete: 'cascade' }),
  customerId: varchar('customer_id', { length: 64 }).notNull(),
  vehicleVin: varchar('vehicle_vin', { length: 64 }).notNull(),
  serviceBayId: varchar('service_bay_id', { length: 64 })
    .notNull()
    .references(() => serviceBays.id),
  technicianId: varchar('technician_id', { length: 64 })
    .notNull()
    .references(() => technicians.id),
  serviceType: varchar('service_type', { length: 64 }).notNull(),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  status: varchar('status', { length: 32 }).default('CONFIRMED').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const dealershipsRelations = relations(dealerships, ({ many }) => ({
  bays: many(serviceBays),
  technicians: many(technicians),
  appointments: many(appointments),
}));

export const techniciansRelations = relations(technicians, ({ one, many }) => ({
  dealership: one(dealerships, { fields: [technicians.dealershipId], references: [dealerships.id] }),
  skills: many(technicianSkills),
  appointments: many(appointments),
}));

export const serviceBaysRelations = relations(serviceBays, ({ one, many }) => ({
  dealership: one(dealerships, { fields: [serviceBays.dealershipId], references: [dealerships.id] }),
  appointments: many(appointments),
}));
