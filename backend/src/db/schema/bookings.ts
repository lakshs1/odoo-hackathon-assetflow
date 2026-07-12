import { pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { bookingStatusEnum } from './enums';
import { assets } from './assets';
import { employees } from './employees';

export const bookings = pgTable('bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id')
    .notNull()
    .references(() => assets.id),
  bookedByEmployeeId: uuid('booked_by_employee_id')
    .notNull()
    .references(() => employees.id),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  status: bookingStatusEnum('status').notNull().default('confirmed'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
