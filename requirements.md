# Requirements Document

## Introduction

AssetFlow is an ERP backend system for enterprise asset lifecycle management. It is built on a **Node.js REST API** using **Drizzle ORM** backed by **Supabase PostgreSQL**, with authentication handled by Supabase Auth. The system covers nine functional modules: Authentication & RBAC, Department & Employee Directory, Asset Categories & Asset Registry, Asset Allocation, Resource Booking, Maintenance Workflow, Audit Module, Notifications, and KPI Dashboard.

Access control is enforced at two layers: **Express middleware** (`requireRole`) is the primary enforcement layer for all API requests; **Supabase RLS policies** serve as a database-level safety net. Because the Node.js API connects to the database using the service-role connection (which bypasses RLS by default), RLS is configured using the `SET ROLE` pattern per request, or treated as a defence-in-depth backstop. The middleware layer is authoritative for all documented role checks.

---

## Glossary

- **System**: The AssetFlow ERP backend as a whole.
- **Super Admin**: The highest-privilege role, bootstrapped manually via the Supabase Dashboard by direct DB role assignment. There is exactly one Super Admin at any time.
- **Admin**: A privileged role assigned by a Super Admin. Can manage departments, employees, assets, and users within the tenant.
- **Manager**: A role that can approve maintenance requests and view allocations for their department.
- **Auditor**: A role assigned to conduct audit cycles and generate discrepancy reports. Read access across asset and allocation data.
- **Employee**: A standard role that can request resource bookings and view their own allocations.
- **RLS Policy**: A PostgreSQL Row-Level Security policy enforced by Supabase to restrict data access based on the authenticated user's role claim.
- **Asset**: A physical or digital item registered in the system and tracked through a defined lifecycle.
- **Asset State**: One of the following lifecycle states for an Asset — Available, Allocated, Reserved, Under Maintenance, Lost, Retired, Disposed.
- **Asset Registry**: The central table storing all Assets and their current state.
- **Asset Category**: A classification grouping Assets by type (e.g., Laptop, Vehicle, Projector).
- **Allocation**: An assignment of an Asset to an Employee or Department for a defined or open-ended period.
- **Resource Booking**: A time-bounded reservation of a shared Asset (resource) by an Employee.
- **Booking Conflict**: A state where a requested time slot for a Resource Booking overlaps with one or more existing confirmed bookings for the same Asset.
- **Maintenance Request**: A record initiating a maintenance workflow for an Asset, following the states Requested → Approved → In Progress → Completed or Rejected.
- **Audit Cycle**: A scheduled period during which one or more Auditors verify the physical existence and condition of Assets.
- **Discrepancy Report**: An auto-generated document listing Assets whose physical state differs from the state recorded in the Asset Registry.
- **pg_cron**: A PostgreSQL extension available in Supabase that schedules recurring SQL jobs.
- **Edge Function**: A Supabase serverless function invoked via HTTP, used for custom business logic not covered by auto-generated REST endpoints.
- **KPI Dashboard**: A set of read-only API endpoints returning aggregated metrics about asset utilization, overdue items, and maintenance activity.
- **JWT Claim**: A field embedded in the Supabase-issued JSON Web Token identifying the authenticated user's role.

---

## Requirements

### Requirement 1: Authentication & RBAC

**User Story:** As a system operator, I want role-based access enforced at the database level so that unauthorized data access is structurally impossible regardless of API layer behavior.

#### Acceptance Criteria

1. THE System SHALL enforce access control for every API route via Express `requireRole` middleware using the authenticated user's JWT role claim. Supabase RLS policies SHALL additionally be applied to all tables as a database-level safety net.
2. WHEN a new user account is created via the API, THE System SHALL assign the `employee` role by default and SHALL NOT permit the requesting user to self-assign a role of `admin`, `manager`, `auditor`, or `super_admin`.
3. WHEN an `admin` role assignment request is received, THE System SHALL allow the operation only if the requesting user holds the `super_admin` or `admin` role.
4. WHEN a `manager` or `auditor` role assignment request is received, THE System SHALL allow the operation only if the requesting user holds the `admin` or `super_admin` role.
5. IF a request arrives with an expired or invalid JWT, THEN THE System SHALL return HTTP 401.
6. IF a request targets a route the authenticated user's role does not permit, THEN THE System SHALL return HTTP 403.
7. THE System SHALL store role assignments in a dedicated `user_roles` table and propagate the role as a custom JWT claim via a Supabase Auth hook.

---

### Requirement 2: Department & Employee Directory

**User Story:** As an Admin, I want to manage departments and employee records so that Assets and Allocations can be linked to organisational units.

#### Acceptance Criteria

1. THE System SHALL maintain a `departments` table with at minimum the fields: `id`, `name`, `created_at`.
2. THE System SHALL maintain an `employees` table with at minimum the fields: `id`, `user_id` (foreign key to `auth.users`), `department_id` (foreign key to `departments`), `full_name`, `employee_code`, `created_at`.
3. WHEN a department creation request is received, THE System SHALL create the department record only if the requesting user holds the `admin` or `super_admin` role.
4. WHEN an employee record creation request is received, THE System SHALL create the record only if the requesting user holds the `admin` or `super_admin` role.
5. IF a department deletion is requested and one or more `employees` records reference that department, THEN THE System SHALL reject the deletion and return HTTP 409.
6. WHEN an employee record is updated, THE System SHALL record the `updated_at` timestamp.

---

### Requirement 3: Asset Categories & Asset Registry

**User Story:** As an Admin, I want to register and categorise assets and track their lifecycle state so that the organisation always knows the status of every asset.

#### Acceptance Criteria

1. THE System SHALL maintain an `asset_categories` table with at minimum the fields: `id`, `name`, `description`.
2. THE System SHALL maintain an `assets` table with at minimum the fields: `id`, `category_id`, `name`, `serial_number`, `state`, `created_at`, `updated_at`.
3. THE System SHALL constrain the `state` column of the `assets` table to the enumerated values: `available`, `allocated`, `reserved`, `under_maintenance`, `lost`, `retired`, `disposed`.
4. THE System SHALL permit only the following state transitions for an Asset:

   | From               | To (permitted)                                    |
   |--------------------|---------------------------------------------------|
   | available          | allocated, reserved, under_maintenance            |
   | allocated          | available, under_maintenance, lost                |
   | reserved           | available, allocated                              |
   | under_maintenance  | available, retired                                |
   | lost               | available, disposed                               |
   | retired            | disposed                                          |
   | disposed           | *(no further transitions)*                        |

5. IF an Asset state transition request specifies a transition not listed in the permitted transitions table, THEN THE System SHALL reject the request and return HTTP 422 with a message identifying the invalid transition.
6. WHEN an Asset is registered, THE System SHALL set its initial state to `available`.
7. THE System SHALL prevent duplicate `serial_number` values across all Assets by enforcing a unique constraint on the `assets.serial_number` column.
8. IF an allocation or booking operation targets an Asset whose current state is not `available`, THEN THE System SHALL reject the operation and return HTTP 409.

---

### Requirement 4: Asset Allocation

**User Story:** As an Admin or Manager, I want to allocate assets to employees or departments so that asset usage is tracked and double-allocation is prevented.

#### Acceptance Criteria

1. THE System SHALL maintain an `allocations` table with at minimum the fields: `id`, `asset_id`, `allocated_to_employee_id` (nullable), `allocated_to_department_id` (nullable), `allocated_by`, `allocated_at`, `returned_at` (nullable), `status`.
2. WHEN an allocation is created, THE System SHALL transition the target Asset's state from `available` to `allocated` atomically within the same database transaction.
3. IF an allocation creation request targets an Asset whose state is not `available`, THEN THE System SHALL reject the request and return HTTP 409.
4. THE System SHALL enforce that each active allocation record has exactly one of `allocated_to_employee_id` or `allocated_to_department_id` set (not both, not neither).
5. WHEN an Asset is returned (allocation closed), THE System SHALL transition the Asset state from `allocated` to `available` and record `returned_at` on the allocation record.
6. WHEN an allocation creation request is received, THE System SHALL allow the operation only if the requesting user holds the `admin`, `manager`, or `super_admin` role.
7. WHEN a maintenance request is created for an Asset whose current `status` is `allocated`, THE System SHALL automatically close the active allocation by setting `returned_at` to the current timestamp and `status` to `returned` within the same database transaction, before transitioning the Asset state to `under_maintenance`.

---

### Requirement 5: Resource Booking

**User Story:** As an Employee, I want to book shared resources for specific time slots so that usage is coordinated without conflicts.

#### Acceptance Criteria

1. THE System SHALL maintain a `bookings` table with at minimum the fields: `id`, `asset_id`, `booked_by_employee_id`, `start_time`, `end_time`, `status`, `created_at`.
2. WHEN a booking creation request is received, THE System SHALL check whether any existing confirmed booking for the same `asset_id` has a time interval that overlaps the requested `[start_time, end_time]` interval.
3. IF a Booking Conflict is detected, THEN THE System SHALL return HTTP 409 and a response body containing the list of the next three available time slots for the requested Asset, each slot being a contiguous interval of the same duration as the requested booking.
4. WHEN a booking creation request passes conflict validation, THE System SHALL create the booking record and transition the Asset state to `reserved`.
5. WHEN a confirmed booking's `end_time` is reached, THE System SHALL transition the Asset state from `reserved` back to `available`.
6. IF a booking cancellation request is received before `start_time`, THEN THE System SHALL set the booking `status` to `cancelled` and transition the Asset state to `available`.
7. THE System SHALL prevent a single Asset from having more than one booking record in `confirmed` status with overlapping time intervals, enforced at the database level.

---

### Requirement 6: Maintenance Workflow

**User Story:** As an Employee or Manager, I want to raise and track maintenance requests so that faulty assets are repaired in an auditable, approval-gated process.

#### Acceptance Criteria

1. THE System SHALL maintain a `maintenance_requests` table with at minimum the fields: `id`, `asset_id`, `requested_by`, `approved_by` (nullable), `state`, `notes`, `created_at`, `updated_at`.
2. THE System SHALL constrain the `state` column of `maintenance_requests` to the enumerated values: `requested`, `approved`, `in_progress`, `completed`, `rejected`.
3. THE System SHALL permit only the following state transitions for a Maintenance Request:

   | From       | To (permitted)           |
   |------------|--------------------------|
   | requested  | approved, rejected       |
   | approved   | in_progress              |
   | in_progress| completed                |

4. WHEN a maintenance request is created, THE System SHALL set the Maintenance Request state to `requested` and transition the referenced Asset state to `under_maintenance`.
5. WHEN a maintenance request state transitions to `approved`, THE System SHALL allow the operation only if the requesting user holds the `manager`, `admin`, or `super_admin` role.
6. WHEN a maintenance request state transitions to `completed`, THE System SHALL transition the referenced Asset state to `available`.
7. WHEN a maintenance request state transitions to `rejected`, THE System SHALL transition the referenced Asset state back to `available`.
8. IF a Maintenance Request state transition request specifies a transition not listed in the permitted transitions table, THEN THE System SHALL reject the request and return HTTP 422.

---

### Requirement 7: Audit Module

**User Story:** As an Auditor, I want scheduled audit cycles with assigned auditors and auto-generated discrepancy reports so that asset records can be verified against physical reality.

#### Acceptance Criteria

1. THE System SHALL maintain an `audit_cycles` table with at minimum the fields: `id`, `name`, `start_date`, `end_date`, `status`, `created_by`, `created_at`.
2. THE System SHALL maintain an `audit_assignments` table linking `audit_cycle_id` to `auditor_employee_id`.
3. THE System SHALL maintain an `audit_findings` table with at minimum the fields: `id`, `audit_cycle_id`, `asset_id`, `expected_state`, `observed_state`, `discrepancy_flag`, `notes`.
4. WHEN an audit cycle reaches its `end_date`, THE System SHALL automatically generate a Discrepancy Report by comparing the `expected_state` and `observed_state` fields in `audit_findings` for that cycle.
5. THE System SHALL store generated Discrepancy Reports in a `discrepancy_reports` table with at minimum the fields: `id`, `audit_cycle_id`, `generated_at`, `report_data` (JSONB).
6. WHEN an audit cycle creation request is received, THE System SHALL allow the operation only if the requesting user holds the `admin` or `super_admin` role.
7. WHILE an audit cycle has `status` = `active`, THE System SHALL allow Auditors assigned to that cycle to create and update `audit_findings` records for that cycle.
8. IF a user without the `auditor`, `admin`, or `super_admin` role attempts to create or modify an `audit_findings` record, THEN THE System SHALL return HTTP 403.

---

### Requirement 8: Notifications

**User Story:** As a system operator, I want automated notifications for overdue returns, upcoming booking reminders, and maintenance events so that stakeholders are informed without manual intervention.

#### Acceptance Criteria

1. THE System SHALL schedule a recurring pg_cron job or Supabase Edge Function that runs at least once per day to identify Allocations where `returned_at` IS NULL and `allocated_at` + the configured overdue threshold has elapsed, and SHALL insert a notification record for the allocated employee.
2. THE System SHALL schedule a recurring pg_cron job or Supabase Edge Function that runs at least once per day to identify confirmed Bookings whose `start_time` is within 24 hours from the current time and for which no reminder notification has been sent, and SHALL insert a notification record for the booking employee.
3. WHEN a Maintenance Request state changes to `approved`, `in_progress`, `completed`, or `rejected`, THE System SHALL insert a notification record for the employee who created the Maintenance Request.
4. THE System SHALL maintain a `notifications` table with at minimum the fields: `id`, `recipient_employee_id`, `type`, `reference_id`, `reference_table`, `message`, `is_read`, `created_at`.
5. WHEN an Employee requests their notifications, THE System SHALL return only notification records where `recipient_employee_id` matches the authenticated user's employee record.
6. WHEN an Employee marks a notification as read, THE System SHALL update the `is_read` field to `true` on that notification record.

---

### Requirement 9: KPI Dashboard

**User Story:** As an Admin or Manager, I want aggregated KPI endpoints so that I can monitor asset utilisation, overdue items, and maintenance activity without running ad-hoc queries.

#### Acceptance Criteria

1. THE System SHALL expose a `/kpi/asset-utilization` endpoint that returns the total count of Assets grouped by `state`.
2. THE System SHALL expose a `/kpi/overdue-allocations` endpoint that returns the count and list of Allocations where `returned_at` IS NULL and the configured overdue threshold has elapsed.
3. THE System SHALL expose a `/kpi/maintenance-activity` endpoint that returns the count of Maintenance Requests grouped by `state` for a caller-specified date range.
4. WHEN a KPI endpoint request is received, THE System SHALL allow the response only if the requesting user holds the `admin`, `manager`, `auditor`, or `super_admin` role.
5. IF a KPI endpoint request is received from a user holding only the `employee` role, THEN THE System SHALL return HTTP 403.
6. THE System SHALL implement KPI endpoints as Express API routes backed by Drizzle ORM aggregation queries on the PostgreSQL database.
7. WHEN a `/kpi/maintenance-activity` request is received without a date range parameter, THE System SHALL default to the current calendar month.
