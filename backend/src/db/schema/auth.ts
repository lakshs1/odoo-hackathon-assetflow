import { pgSchema, pgTable, uuid, timestamp } from 'drizzle-orm/pg-core';
import { userRoleEnum } from './enums';

const authSchema = pgSchema('auth');
export const users = authSchema.table('users', {
  id: uuid('id').primaryKey(),
});

export const userRoles = pgTable('user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: userRoleEnum('role').notNull().default('employee'),
  assignedBy: uuid('assigned_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
