import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { departments } from './departments';
import { users } from './auth';

export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  departmentId: uuid('department_id')
    .notNull()
    .references(() => departments.id),
  fullName: text('full_name').notNull(),
  employeeCode: text('employee_code').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
