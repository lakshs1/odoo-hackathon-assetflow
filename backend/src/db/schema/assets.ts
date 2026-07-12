import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { assetStateEnum } from './enums';

export const assetCategories = pgTable('asset_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
});

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => assetCategories.id),
  name: text('name').notNull(),
  serialNumber: text('serial_number').notNull().unique(),
  state: assetStateEnum('state').notNull().default('available'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
