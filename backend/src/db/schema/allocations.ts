import { pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { allocationStatusEnum } from './enums';
import { assets } from './assets';
import { departments } from './departments';
import { employees } from './employees';

export const allocations = pgTable('allocations', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id')
    .notNull()
    .references(() => assets.id),
  allocatedToEmployeeId: uuid('allocated_to_employee_id').references(() => employees.id),
  allocatedToDepartmentId: uuid('allocated_to_department_id').references(() => departments.id),
  allocatedBy: uuid('allocated_by')
    .notNull()
    .references(() => employees.id),
  allocatedAt: timestamp('allocated_at', { withTimezone: true }).notNull().defaultNow(),
  returnedAt: timestamp('returned_at', { withTimezone: true }),
  status: allocationStatusEnum('status').notNull().default('active'),
});
