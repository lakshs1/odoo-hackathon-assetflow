import { boolean, date, jsonb, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { auditCycleStatusEnum, assetStateEnum } from './enums';
import { employees } from './employees';
import { assets } from './assets';

export const auditCycles = pgTable('audit_cycles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  status: auditCycleStatusEnum('status').notNull().default('planned'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => employees.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const auditAssignments = pgTable(
  'audit_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    auditCycleId: uuid('audit_cycle_id')
      .notNull()
      .references(() => auditCycles.id, { onDelete: 'cascade' }),
    auditorEmployeeId: uuid('auditor_employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    auditCycleAuditorUnique: unique('uniq_audit_assignment').on(
      table.auditCycleId,
      table.auditorEmployeeId
    ),
  })
);

export const auditFindings = pgTable('audit_findings', {
  id: uuid('id').primaryKey().defaultRandom(),
  auditCycleId: uuid('audit_cycle_id')
    .notNull()
    .references(() => auditCycles.id, { onDelete: 'cascade' }),
  assetId: uuid('asset_id')
    .notNull()
    .references(() => assets.id),
  expectedState: assetStateEnum('expected_state').notNull(),
  observedState: assetStateEnum('observed_state').notNull(),
  discrepancyFlag: boolean('discrepancy_flag').notNull(),
  notes: text('notes'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => employees.id),
});

export const discrepancyReports = pgTable('discrepancy_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  auditCycleId: uuid('audit_cycle_id')
    .notNull()
    .references(() => auditCycles.id, { onDelete: 'cascade' }),
  generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
  reportData: jsonb('report_data').notNull(),
});
