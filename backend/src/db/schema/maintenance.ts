import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { maintenanceStateEnum } from './enums';
import { assets } from './assets';
import { employees } from './employees';

export const maintenanceRequests = pgTable('maintenance_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id')
    .notNull()
    .references(() => assets.id),
  requestedBy: uuid('requested_by')
    .notNull()
    .references(() => employees.id),
  approvedBy: uuid('approved_by').references(() => employees.id),
  state: maintenanceStateEnum('state').notNull().default('requested'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
