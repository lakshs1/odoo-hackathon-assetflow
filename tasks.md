# Implementation Plan: AssetFlow ERP Backend

## Overview

Implement the AssetFlow ERP backend as a **Node.js REST API** using **Drizzle ORM** connected to **Supabase PostgreSQL**. Authentication is handled by Supabase Auth with JWT verification in Express middleware. RBAC is enforced at the route level. Scheduled jobs and DB triggers run inside Supabase. Tasks follow the dependency order: project scaffold → DB schema → middleware → modules (routes + services) → Supabase triggers & pg_cron → tests.

---

## Tasks

- [ ] 1. Project scaffold and database foundation
  - [ ] 1.1 Initialize Node.js project with TypeScript, Express, and Drizzle ORM
    - Create `package.json` with dependencies: `express`, `drizzle-orm`, `postgres`, `@supabase/supabase-js`, `zod`, `dotenv`
    - Add dev dependencies: `typescript`, `tsx`, `drizzle-kit`, `vitest`, `supertest`
    - Create `tsconfig.json`, `drizzle.config.ts`, `.env.example`
    - Create `src/server.ts` (HTTP server entry) and `src/app.ts` (Express app with JSON middleware and global error handler)
    - _Requirements: all_

  - [ ] 1.2 Set up Drizzle client and database connection
    - Create `src/db/index.ts` — instantiate `postgres` driver with `DATABASE_URL` env var and export the Drizzle `db` instance
    - Create `src/lib/supabase.ts` — export Supabase admin client using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
    - Create `src/lib/errors.ts` — define `AppError` and `ConflictError` classes
    - _Requirements: all_

  - [ ] 1.3 Define all Drizzle enums in `src/db/schema/enums.ts`
    - Define `pgEnum` for: `asset_state`, `maintenance_state`, `booking_status`, `notification_type`, `allocation_status`, `audit_cycle_status`, `user_role`
    - _Requirements: 3.3, 6.2_

- [ ] 2. Auth & RBAC — schema, middleware, and role assignment
  - [ ] 2.1 Create `src/db/schema/auth.ts` — `user_roles` table
    - Fields: `id`, `user_id` (unique), `role` (default `employee`), `assigned_by`, `created_at`
    - _Requirements: 1.2, 1.7_

  - [ ] 2.2 Create JWT auth middleware `src/middleware/auth.ts`
    - Call `supabase.auth.getUser(token)` to verify JWT
    - Attach `req.user = { id, role }` from `app_metadata.role`; return HTTP 401 on failure
    - _Requirements: 1.1, 1.5_

  - [ ] 2.3 Create RBAC middleware `src/middleware/rbac.ts`
    - Implement `requireRole(...roles)` factory that returns HTTP 403 if `req.user.role` is not in the allowed list
    - _Requirements: 1.3, 1.4, 1.6_

  - [ ] 2.4 Implement `src/modules/auth/auth.service.ts` — role assignment
    - Define `CAN_ASSIGN` permission matrix
    - `assignRole(requesterId, requesterRole, targetUserId, targetRole)`: validate via matrix, Drizzle upsert on `user_roles`, throw `AppError(403)` if unauthorized
    - _Requirements: 1.3, 1.4_

  - [ ] 2.5 Implement `src/modules/auth/auth.routes.ts`
    - `POST /api/auth/assign-role` — authenticate, requireRole('admin', 'super_admin'), call `assignRole`
    - _Requirements: 1.3, 1.4_

  - [ ] 2.6 Create Supabase Auth hook `supabase/functions/auth-hook/index.ts`
    - Read `user_roles` for the signing-in user; inject `{ app_metadata: { role } }` into the JWT response
    - Default to `'employee'` if no row exists
    - _Requirements: 1.7_

  - [ ] 2.7 Write migration: `user_roles` default-role trigger
    - `trg_create_user_role`: AFTER INSERT ON `auth.users`; inserts `user_roles` row with `role = 'employee'`
    - Place in `supabase/migrations/`
    - _Requirements: 1.2_

  - [ ]* 2.8 Write tests for auth middleware and role assignment service
    - Test: expired/missing JWT → 401; valid JWT attaches `req.user`
    - Test: `assignRole` with all `(requesterRole, targetRole)` pairs — permitted pairs succeed, unpermitted return 403
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [ ] 3. Department & Employee Directory — schema, services, and routes
  - [ ] 3.1 Create Drizzle schema files
    - `src/db/schema/departments.ts`: `id`, `name`, `created_at`
    - `src/db/schema/employees.ts`: `id`, `user_id`, `department_id` (FK → departments RESTRICT), `full_name`, `employee_code` (unique), `created_at`, `updated_at`
    - _Requirements: 2.1, 2.2_

  - [ ] 3.2 Write migration: `trg_employees_updated_at` trigger
    - BEFORE UPDATE ON `employees`; sets `updated_at = now()`
    - _Requirements: 2.6_

  - [ ] 3.3 Implement `src/modules/departments/departments.service.ts`
    - `list()`, `create(data)`, `update(id, data)`, `remove(id)` — catch FK violation on delete and throw `AppError(409, 'Cannot delete department with employees')`
    - _Requirements: 2.3, 2.5_

  - [ ] 3.4 Implement `src/modules/departments/departments.routes.ts`
    - GET `/api/departments` (all authenticated), POST/PATCH/DELETE (admin, super_admin)
    - _Requirements: 2.3, 2.5_

  - [ ] 3.5 Implement `src/modules/employees/employees.service.ts` and `employees.routes.ts`
    - CRUD with `updatedAt: new Date()` on every update call
    - GET `/api/employees` (all), POST/PATCH (admin, super_admin)
    - _Requirements: 2.4, 2.6_

  - [ ]* 3.6 Write tests for departments and employees modules
    - Test: non-admin create → 403; delete department with employee → 409; `updated_at` increments on update
    - _Requirements: 2.3, 2.4, 2.5, 2.6_

- [ ] 4. Asset Categories & Registry — schema, state machine, services, and routes
  - [ ] 4.1 Create Drizzle schema files
    - `src/db/schema/assets.ts`: `asset_categories` (`id`, `name`, `description`) and `assets` (`id`, `category_id`, `name`, `serial_number` unique, `state` default `available`, `created_at`, `updated_at`)
    - _Requirements: 3.1, 3.2, 3.3, 3.6, 3.7_

  - [ ] 4.2 Write migration: asset state machine trigger
    - Create `asset_valid_transitions(from_state, to_state)` lookup table; populate all 13 permitted pairs
    - Create `validate_asset_transition()` PL/pgSQL function; raise `ERRCODE '22000'` on unlisted transitions
    - Attach `trg_validate_asset_transition` BEFORE UPDATE OF state ON `assets`
    - _Requirements: 3.4, 3.5_

  - [ ] 4.3 Implement `src/modules/assets/assets.service.ts`
    - `listCategories()`, `createCategory(data)`, `listAssets()`, `createAsset(data)`, `transitionState(id, newState, role)` — validate against `VALID_TRANSITIONS` map; catch DB trigger `'22000'` and rethrow as `AppError(422)`
    - _Requirements: 3.4, 3.5, 3.6, 3.7, 3.8_

  - [ ] 4.4 Implement `src/modules/assets/assets.routes.ts`
    - GET `/api/asset-categories` (all), POST (admin, super_admin)
    - GET `/api/assets` (all), POST (admin, super_admin), PATCH `/api/assets/:id/state` (admin, super_admin)
    - _Requirements: 3.1, 3.2, 3.4, 3.5_

  - [ ]* 4.5 Write tests for assets module
    - Test: new asset has `state = 'available'`; valid transitions succeed; invalid transitions return 422; duplicate serial_number returns 409
    - _Requirements: 3.4, 3.5, 3.6, 3.7_

- [ ] 5. Checkpoint — core schema and modules complete
  - Run `drizzle-kit generate` and `drizzle-kit migrate` against a clean Supabase project
  - Verify all Supabase migration SQL applies cleanly (triggers, enums, constraints)
  - Smoke-test auth, department, employee, and asset endpoints

- [ ] 6. Asset Allocation — schema, transaction service, and routes
  - [ ] 6.1 Create `src/db/schema/allocations.ts`
    - Fields per design; XOR check constraint added via raw SQL in migration
    - _Requirements: 4.1, 4.4_

  - [ ] 6.2 Implement `src/modules/allocations/allocations.service.ts`
    - `createAllocation(data, actorEmployeeId)`: Drizzle transaction with `FOR UPDATE` lock on asset row; check `state === 'available'`; atomically update asset + insert allocation; throw `AppError(409)` if not available
    - `returnAllocation(allocationId)`: Drizzle transaction to set `returned_at`, `status = 'returned'`; update asset to `available`
    - `listAllocations(userId, role)`: scope to own allocations for employee; all for admin/manager/super_admin
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ] 6.3 Implement `src/modules/allocations/allocations.routes.ts`
    - GET `/api/allocations` (all authenticated, scoped), POST (admin, manager, super_admin), POST `/api/allocations/:id/return` (admin, manager, super_admin)
    - _Requirements: 4.2, 4.3, 4.5, 4.6_

  - [ ]* 6.4 Write tests for allocations module
    - Test: allocate available asset → asset becomes `allocated`; allocate non-available asset → 409; return allocation → asset back to `available`, `returned_at` set; XOR constraint enforced
    - _Requirements: 4.2, 4.3, 4.4, 4.5_

- [ ] 7. Resource Booking — schema, overlap logic, services, and routes
  - [ ] 7.1 Create `src/db/schema/bookings.ts`
    - Fields per design; `booking_time_order` check and `tstzrange` exclusion constraint added via raw SQL migration (requires `btree_gist` extension)
    - _Requirements: 5.1, 5.7_

  - [ ] 7.2 Implement `src/modules/bookings/bookings.service.ts`
    - `createBooking(data)`: query overlapping confirmed bookings via Drizzle; on conflict call `getNextAvailableSlots()` and throw `ConflictError(409, { nextAvailable })`; on success Drizzle transaction inserts booking + transitions asset to `reserved`
    - `getNextAvailableSlots(assetId, start, end)`: walk sorted confirmed bookings greedily; return first 3 non-overlapping slots of same duration
    - `cancelBooking(bookingId, userId, role)`: verify ownership and `start_time > now()`; Drizzle transaction sets `status = 'cancelled'` + asset to `available`
    - _Requirements: 5.2, 5.3, 5.4, 5.6_

  - [ ] 7.3 Implement `src/modules/bookings/bookings.routes.ts`
    - GET `/api/bookings` (all, scoped), POST (all authenticated), POST `/api/bookings/:id/cancel` (owner or admin)
    - _Requirements: 5.2, 5.3, 5.4, 5.6_

  - [ ] 7.4 Write migration: `expire-bookings` pg_cron job
    - Schedule `*/5 * * * *`; SQL: set expired confirmed bookings to `completed`; set reserved assets to `available`
    - _Requirements: 5.5_

  - [ ]* 7.5 Write tests for bookings module
    - Test: successful booking → asset `reserved`; overlapping booking → 409 + 3 next slots; cancel before start → asset `available`; pg_cron SQL logic with expired booking seed data
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [ ] 8. Maintenance Workflow — schema, state machine service, and routes
  - [ ] 8.1 Create `src/db/schema/maintenance.ts`
    - Fields per design
    - _Requirements: 6.1, 6.2_

  - [ ] 8.2 Write migration: maintenance state machine trigger
    - Create `maintenance_valid_transitions(from_state, to_state)` lookup table; populate 4 permitted pairs
    - Create `validate_maintenance_transition()` trigger function; raise `ERRCODE '22000'` on unlisted transitions
    - Attach `trg_validate_maintenance_transition` BEFORE UPDATE OF state ON `maintenance_requests`
    - _Requirements: 6.3_

  - [ ] 8.3 Implement `src/modules/maintenance/maintenance.service.ts`
    - `createMaintenanceRequest(data)`: Drizzle transaction — (1) insert request (`state = 'requested'`); (2) check for active allocation on the asset and if found, close it by setting `returned_at = now()` and `status = 'returned'`; (3) update asset state to `under_maintenance`
    - `transitionMaintenanceRequest(requestId, newState, actorRole)`: validate `ALLOWED_TRANSITIONS`; check role for `approved`; Drizzle transaction updates state + `updated_at`; on `completed`/`rejected` sets asset to `available`; always inserts `notifications` row for the requester
    - _Requirements: 4.7, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 8.3_

  - [ ] 8.4 Implement `src/modules/maintenance/maintenance.routes.ts`
    - GET `/api/maintenance` (all, scoped), POST (all authenticated), PATCH `/api/maintenance/:id/state` (manager, admin, super_admin)
    - _Requirements: 6.4, 6.5, 6.6, 6.7, 6.8_

  - [ ]* 8.5 Write tests for maintenance module
    - Test: create request on available asset → asset `under_maintenance`; create request on allocated asset → active allocation is closed (`returned_at` set) AND asset goes `under_maintenance`; approve without correct role → 403; complete → asset `available`; rejected → asset `available`; invalid transition → 422; notification inserted on each state change
    - _Requirements: 4.7, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 8.3_

- [ ] 9. Checkpoint — allocation, booking, and maintenance complete
  - Verify all Drizzle transactions are atomic; run migrations end-to-end on clean DB; smoke-test all workflows

- [ ] 10. Audit Module — schema, services, and routes
  - [ ] 10.1 Create `src/db/schema/audit.ts`
    - `audit_cycles`, `audit_assignments` (unique constraint on cycle+auditor), `audit_findings` (generated `discrepancy_flag`), `discrepancy_reports` (JSONB)
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

  - [ ] 10.2 Implement `src/modules/audit/audit.service.ts`
    - `createCycle(data)`, `listCycles()`, `addAssignment(cycleId, auditorEmployeeId)`, `createFinding(data, actorEmployeeId)` — verify caller is assigned to the cycle and cycle is `active`; throw `AppError(403)` otherwise
    - `listFindings(cycleId)`, `getDiscrepancyReport(cycleId)`
    - _Requirements: 7.6, 7.7, 7.8_

  - [ ] 10.3 Implement `src/modules/audit/audit.routes.ts`
    - GET/POST `/api/audit/cycles` (GET: all; POST: admin, super_admin)
    - POST `/api/audit/cycles/:id/assignments` (admin, super_admin)
    - POST `/api/audit/findings` (auditor, admin, super_admin — further scoping in service)
    - _Requirements: 7.6, 7.7, 7.8_

  - [ ] 10.4 Write migration: `generate-discrepancy-reports` pg_cron job
    - Schedule `0 1 * * *`; aggregate discrepant findings per cycle into JSONB; insert `discrepancy_reports`; set cycle `status = 'completed'`
    - _Requirements: 7.4_

  - [ ]* 10.5 Write tests for audit module
    - Test: non-admin cycle creation → 403; unassigned auditor finding insert → 403; assigned auditor on active cycle succeeds; pg_cron SQL produces correct JSONB shape
    - _Requirements: 7.6, 7.7, 7.8_

- [ ] 11. Notifications — schema, services, and routes
  - [ ] 11.1 Create `src/db/schema/notifications.ts`
    - All fields per design
    - _Requirements: 8.4_

  - [ ] 11.2 Implement `src/modules/notifications/notifications.service.ts`
    - `getMyNotifications(userId)`: look up employee by `userId`; return notifications where `recipient_employee_id = employee.id`
    - `markAsRead(notificationId, userId)`: verify ownership; `db.update` sets `is_read = true`
    - _Requirements: 8.5, 8.6_

  - [ ] 11.3 Implement `src/modules/notifications/notifications.routes.ts`
    - GET `/api/notifications` (all authenticated, own only)
    - PATCH `/api/notifications/:id/read` (all authenticated, own only)
    - _Requirements: 8.5, 8.6_

  - [ ] 11.4 Write migrations: overdue and reminder pg_cron jobs
    - `overdue-allocation-notify` (`0 8 * * *`): insert `overdue_return` notifications for active allocations past 30 days, deduplicated within 24 h
    - `booking-reminder-notify` (`0 8 * * *`): insert `booking_reminder` for confirmed bookings starting within 24 h (skip if already sent)
    - _Requirements: 8.1, 8.2_

  - [ ]* 11.5 Write tests for notifications module
    - Test: employee only sees own notifications; mark-as-read idempotent; pg_cron SQL deduplication logic
    - _Requirements: 8.5, 8.6_

- [ ] 12. KPI Dashboard — services and routes
  - [ ] 12.1 Implement `src/modules/kpi/kpi.service.ts`
    - `assetUtilization()`: `db.select({ state, count: count() }).from(assets).groupBy(assets.state)`
    - `overdueAllocations()`: filter active allocations where `allocatedAt + 30d < now()`; return count + list
    - `maintenanceActivity(start, end)`: group by state within date range; default range = current calendar month
    - _Requirements: 9.1, 9.2, 9.3, 9.7_

  - [ ] 12.2 Implement `src/modules/kpi/kpi.routes.ts`
    - GET `/api/kpi/asset-utilization`, `/api/kpi/overdue-allocations`, `/api/kpi/maintenance-activity` — all guarded by `requireRole('admin', 'manager', 'auditor', 'super_admin')`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.7_

  - [ ]* 12.3 Write tests for KPI module
    - Test: employee role → 403 on all three endpoints; counts match direct DB queries; maintenance-activity defaults to current month when no params
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.7_

- [ ] 13. Register all routes and final integration
  - [ ] 13.1 Register all module routers in `src/app.ts`
    - Mount all routers under `/api`; add global error handler that maps `AppError` to HTTP status + JSON body
    - _Requirements: all_

  - [ ] 13.2 Run full migration suite against clean Supabase project
    - `drizzle-kit migrate` for schema; apply all `supabase/migrations/` SQL (triggers, pg_cron jobs, constraints)
    - Verify pg_cron jobs registered: `SELECT * FROM cron.job`
    - _Requirements: all_

  - [ ]* 13.3 Write end-to-end integration tests
    - Seed a test DB; run all happy-path and error-path flows using `supertest`; assert HTTP status and response bodies
    - _Requirements: all_

---

## Notes

- Tasks marked `*` are optional and can be skipped for MVP
- Drizzle migrations (`drizzle-kit generate`) handle schema; raw SQL migrations (`supabase/migrations/`) handle triggers, pg_cron jobs, and constraints Drizzle can't express (tstzrange exclusion, XOR check, generated columns)
- All Drizzle transactions use `db.transaction(async (tx) => { ... })` for atomic multi-step operations
- Booking overlap check is done at the application layer first; the `tstzrange` exclusion constraint is the DB-level safety net
- State machine validation is done at the application layer first; DB triggers are last-resort guards
- `btree_gist` extension must be enabled before the `bookings` exclusion constraint migration runs
- All migration files should be numbered sequentially

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "3.1", "4.1", "6.1", "7.1", "8.1", "10.1", "11.1"] },
    { "id": 2, "tasks": ["2.4", "2.5", "2.6", "2.7", "3.2", "4.2", "7.2", "8.2"] },
    { "id": 3, "tasks": ["3.3", "3.4", "3.5", "4.3", "4.4", "6.2", "7.3", "8.3", "10.2", "11.2", "12.1"] },
    { "id": 4, "tasks": ["2.8", "3.6", "4.5", "6.3", "7.4", "8.4", "10.3", "10.4", "11.3", "11.4", "12.2"] },
    { "id": 5, "tasks": ["5"] },
    { "id": 6, "tasks": ["6.4", "7.5", "8.5", "10.5", "11.5", "12.3"] },
    { "id": 7, "tasks": ["9"] },
    { "id": 8, "tasks": ["13.1", "13.2"] },
    { "id": 9, "tasks": ["13.3"] }
  ]
}
```
