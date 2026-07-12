import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { notificationTypeEnum } from './enums';
import { employees } from './employees';

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  recipientEmployeeId: uuid('recipient_employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum('type').notNull(),
  referenceId: uuid('reference_id').notNull(),
  referenceTable: text('reference_table').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
