import { pgEnum } from 'drizzle-orm/pg-core';

export const assetStateEnum = pgEnum('asset_state', [
  'available',
  'allocated',
  'reserved',
  'under_maintenance',
  'lost',
  'retired',
  'disposed',
]);

export const maintenanceStateEnum = pgEnum('maintenance_state', [
  'requested',
  'approved',
  'in_progress',
  'completed',
  'rejected',
]);

export const bookingStatusEnum = pgEnum('booking_status', [
  'confirmed',
  'cancelled',
  'completed',
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'overdue_return',
  'booking_reminder',
  'maintenance_update',
]);

export const allocationStatusEnum = pgEnum('allocation_status', [
  'active',
  'returned',
]);

export const auditCycleStatusEnum = pgEnum('audit_cycle_status', [
  'planned',
  'active',
  'completed',
]);

export const userRoleEnum = pgEnum('user_role', [
  'super_admin',
  'admin',
  'manager',
  'auditor',
  'employee',
]);
