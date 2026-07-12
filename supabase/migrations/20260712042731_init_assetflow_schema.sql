-- ==========================================
-- AssetFlow Supabase DB Schema
-- ==========================================

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "btree_gist";
create extension if not exists "pg_cron";

-- ==========================================
-- 1. Custom Types and Enums (Lowercase)
-- ==========================================
create type public.asset_state as enum ('available', 'allocated', 'reserved', 'under_maintenance', 'lost', 'retired', 'disposed');
create type public.maintenance_state as enum ('requested', 'approved', 'in_progress', 'completed', 'rejected');
create type public.booking_status as enum ('confirmed', 'cancelled', 'completed');
create type public.notification_type as enum ('overdue_return', 'booking_reminder', 'maintenance_update');
create type public.allocation_status as enum ('active', 'returned');
create type public.audit_cycle_status as enum ('planned', 'active', 'completed');
create type public.user_role as enum ('super_admin', 'admin', 'manager', 'auditor', 'employee');

-- ==========================================
-- 2. Core Tables
-- ==========================================

-- User Roles Table (RBAC)
create table public.user_roles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null unique references auth.users(id) on delete cascade,
    role public.user_role not null default 'employee',
    assigned_by uuid references auth.users(id) on delete set null,
    created_at timestamp with time zone not null default now()
);

-- Departments Table
create table public.departments (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    created_at timestamp with time zone not null default now()
);

-- Employees Table
create table public.employees (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null unique references auth.users(id) on delete cascade,
    department_id uuid not null references public.departments(id),
    full_name text not null,
    employee_code text not null unique,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

-- Asset Categories Table
create table public.asset_categories (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text
);

-- Assets Table
create table public.assets (
    id uuid primary key default gen_random_uuid(),
    category_id uuid not null references public.asset_categories(id),
    name text not null,
    serial_number text not null unique,
    state public.asset_state not null default 'available',
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

-- Allocations Table
create table public.allocations (
    id uuid primary key default gen_random_uuid(),
    asset_id uuid not null references public.assets(id),
    allocated_to_employee_id uuid references public.employees(id),
    allocated_to_department_id uuid references public.departments(id),
    allocated_by uuid not null references public.employees(id),
    allocated_at timestamp with time zone not null default now(),
    returned_at timestamp with time zone,
    status public.allocation_status not null default 'active',
    
    constraint allocation_target_xor check (
        (allocated_to_employee_id is null) <> (allocated_to_department_id is null)
    )
);

-- Bookings Table
create table public.bookings (
    id uuid primary key default gen_random_uuid(),
    asset_id uuid not null references public.assets(id),
    booked_by_employee_id uuid not null references public.employees(id),
    start_time timestamp with time zone not null,
    end_time timestamp with time zone not null,
    status public.booking_status not null default 'confirmed',
    created_at timestamp with time zone not null default now(),
    
    constraint booking_time_order check (end_time > start_time)
);

-- Exclude overlapping bookings using gist index (only active/confirmed bookings block slot)
alter table public.bookings
    add constraint booking_no_overlap exclude using gist (
        asset_id with =,
        (tstzrange(start_time, end_time)) with &&
    ) where (status = 'confirmed');

-- Maintenance Requests Table
create table public.maintenance_requests (
    id uuid primary key default gen_random_uuid(),
    asset_id uuid not null references public.assets(id),
    requested_by uuid not null references public.employees(id),
    approved_by uuid references public.employees(id),
    state public.maintenance_state not null default 'requested',
    notes text,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

-- Audit Cycles Table
create table public.audit_cycles (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    start_date date not null,
    end_date date not null,
    status public.audit_cycle_status not null default 'planned',
    created_by uuid not null references public.employees(id),
    created_at timestamp with time zone not null default now()
);

-- Audit Assignments Table
create table public.audit_assignments (
    id uuid primary key default gen_random_uuid(),
    audit_cycle_id uuid not null references public.audit_cycles(id) on delete cascade,
    auditor_employee_id uuid not null references public.employees(id) on delete cascade,
    
    constraint uniq_audit_assignment unique (audit_cycle_id, auditor_employee_id)
);

-- Audit Findings Table
create table public.audit_findings (
    id uuid primary key default gen_random_uuid(),
    audit_cycle_id uuid not null references public.audit_cycles(id) on delete cascade,
    asset_id uuid not null references public.assets(id),
    expected_state public.asset_state not null,
    observed_state public.asset_state not null,
    discrepancy_flag boolean not null generated always as (expected_state <> observed_state) stored,
    notes text,
    created_by uuid not null references public.employees(id)
);

-- Discrepancy Reports Table
create table public.discrepancy_reports (
    id uuid primary key default gen_random_uuid(),
    audit_cycle_id uuid not null references public.audit_cycles(id) on delete cascade,
    generated_at timestamp with time zone not null default now(),
    report_data jsonb not null
);

-- Notifications Table
create table public.notifications (
    id uuid primary key default gen_random_uuid(),
    recipient_employee_id uuid not null references public.employees(id) on delete cascade,
    type public.notification_type not null,
    reference_id uuid not null,
    reference_table text not null,
    message text not null,
    is_read boolean not null default false,
    created_at timestamp with time zone not null default now()
);

-- ==========================================
-- 3. Database Triggers & Handlers
-- ==========================================

-- A. Auto-create User Role (Default to 'employee' on Signup)
create or replace function public.handle_new_user_role()
returns trigger as $$
begin
    insert into public.user_roles (user_id, role)
    values (new.id, 'employee');
    return new;
end;
$$ language plpgsql security definer;

create trigger trg_create_user_role
    after insert on auth.users
    for each row
    execute procedure public.handle_new_user_role();

-- B. Validate Asset State transitions
create or replace function public.validate_asset_transition()
returns trigger as $$
begin
    if old.state = new.state then
        return new;
    end if;

    if old.state = 'available' and new.state not in ('allocated', 'reserved', 'under_maintenance') then
        raise exception 'Invalid transition from % to %', old.state, new.state using errcode = '22000';
    elsif old.state = 'allocated' and new.state not in ('available', 'under_maintenance', 'lost') then
        raise exception 'Invalid transition from % to %', old.state, new.state using errcode = '22000';
    elsif old.state = 'reserved' and new.state not in ('available', 'allocated') then
        raise exception 'Invalid transition from % to %', old.state, new.state using errcode = '22000';
    elsif old.state = 'under_maintenance' and new.state not in ('available', 'retired') then
        raise exception 'Invalid transition from % to %', old.state, new.state using errcode = '22000';
    elsif old.state = 'lost' and new.state not in ('available', 'disposed') then
        raise exception 'Invalid transition from % to %', old.state, new.state using errcode = '22000';
    elsif old.state = 'retired' and new.state not in ('disposed') then
        raise exception 'Invalid transition from % to %', old.state, new.state using errcode = '22000';
    elsif old.state = 'disposed' then
        raise exception 'Invalid transition from % to %', old.state, new.state using errcode = '22000';
    end if;

    return new;
end;
$$ language plpgsql;

create trigger trg_validate_asset_transition
    before update of state on public.assets
    for each row
    execute procedure public.validate_asset_transition();

-- C. Validate Maintenance Request transitions
create or replace function public.validate_maintenance_transition()
returns trigger as $$
begin
    if old.state = new.state then
        return new;
    end if;

    if old.state = 'requested' and new.state not in ('approved', 'rejected') then
        raise exception 'Invalid transition from % to %', old.state, new.state using errcode = '22000';
    elsif old.state = 'approved' and new.state not in ('in_progress') then
        raise exception 'Invalid transition from % to %', old.state, new.state using errcode = '22000';
    elsif old.state = 'in_progress' and new.state not in ('completed') then
        raise exception 'Invalid transition from % to %', old.state, new.state using errcode = '22000';
    elsif old.state in ('completed', 'rejected') then
        raise exception 'Invalid transition from % to %', old.state, new.state using errcode = '22000';
    end if;

    return new;
end;
$$ language plpgsql;

create trigger trg_validate_maintenance_transition
    before update of state on public.maintenance_requests
    for each row
    execute procedure public.validate_maintenance_transition();

-- D. Sync Employees updated_at Timestamp
create or replace function public.update_employees_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger trg_employees_updated_at
    before update on public.employees
    for each row
    execute procedure public.update_employees_updated_at();

-- ==========================================
-- 4. Helper Stored Procedures for Cron Jobs
-- ==========================================

-- Routine to generate daily discrepancy reports for closed active cycles
create or replace function public.generate_daily_discrepancy_reports()
returns void as $$
declare
    r record;
    v_report_data jsonb;
begin
    for r in 
        select id 
        from public.audit_cycles 
        where status = 'active' and end_date <= current_date
    loop
        -- Aggregate all discrepancy findings (where discrepancy_flag is true)
        select coalesce(jsonb_agg(to_jsonb(f)), '[]'::jsonb)
        into v_report_data
        from public.audit_findings f
        where f.audit_cycle_id = r.id and f.discrepancy_flag = true;
        
        -- Insert report
        insert into public.discrepancy_reports (audit_cycle_id, report_data)
        values (r.id, v_report_data);
        
        -- Complete cycle
        update public.audit_cycles
        set status = 'completed'
        where id = r.id;
    end loop;
end;
$$ language plpgsql;

-- ==========================================
-- 5. Scheduled Jobs (pg_cron)
-- ==========================================

-- Booking expiry (every 5 minutes)
select cron.schedule(
    'booking-expiry-job',
    '*/5 * * * *',
    $$
    with expired_bookings as (
        update public.bookings
        set status = 'completed'
        where status = 'confirmed' and end_time < now()
        returning asset_id
    )
    update public.assets
    set state = 'available'
    where id in (select asset_id from expired_bookings) and state = 'reserved';
    $$
);

-- Overdue return notifications (daily at 8 AM)
select cron.schedule(
    'overdue-returns-job',
    '0 8 * * *',
    $$
    insert into public.notifications (recipient_employee_id, type, reference_id, reference_table, message)
    select 
        coalesce(a.allocated_to_employee_id, a.allocated_by), 
        'overdue_return'::public.notification_type, 
        a.id, 
        'allocations', 
        'Allocation of asset is overdue by 30 days.'
    from public.allocations a
    where a.status = 'active'
      and a.allocated_at < now() - interval '30 days'
      and not exists (
          select 1 from public.notifications n
          where n.reference_id = a.id
            and n.type = 'overdue_return'
            and n.created_at > now() - interval '24 hours'
      );
    $$
);

-- Booking reminders (daily at 8 AM)
select cron.schedule(
    'booking-reminders-job',
    '0 8 * * *',
    $$
    insert into public.notifications (recipient_employee_id, type, reference_id, reference_table, message)
    select 
        b.booked_by_employee_id, 
        'booking_reminder'::public.notification_type, 
        b.id, 
        'bookings', 
        'Reminder: You have a booking starting at ' || b.start_time::text
    from public.bookings b
    where b.status = 'confirmed'
      and b.start_time > now()
      and b.start_time <= now() + interval '24 hours'
      and not exists (
          select 1 from public.notifications n
          where n.reference_id = b.id
            and n.type = 'booking_reminder'
      );
    $$
);

-- Discrepancy reports (daily at 1 AM)
select cron.schedule(
    'discrepancy-reports-job',
    '0 1 * * *',
    'select public.generate_daily_discrepancy_reports();'
);

-- ==========================================
-- 6. Indexes for Optimization
-- ==========================================
create index idx_user_roles_user on public.user_roles(user_id);
create index idx_employees_department on public.employees(department_id);
create index idx_employees_user on public.employees(user_id);
create index idx_assets_category on public.assets(category_id);
create index idx_assets_state on public.assets(state);
create index idx_allocations_asset_status on public.allocations(asset_id, status);
create index idx_allocations_employee on public.allocations(allocated_to_employee_id);
create index idx_allocations_department on public.allocations(allocated_to_department_id);
create index idx_bookings_asset_dates on public.bookings(asset_id, start_time, end_time);
create index idx_maintenance_asset_state on public.maintenance_requests(asset_id, state);
create index idx_audit_assignments_cycle on public.audit_assignments(audit_cycle_id);
create index idx_notifications_recipient on public.notifications(recipient_employee_id, is_read);
