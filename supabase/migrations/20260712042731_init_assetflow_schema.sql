-- ==========================================
-- AssetFlow Supabase DB Schema
-- ==========================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ==========================================
-- 1. Custom Types and Enums
-- ==========================================
create type employee_role as enum ('Admin', 'Asset Manager', 'Department Head', 'Employee');
create type asset_condition as enum ('New', 'Good', 'Fair', 'Poor', 'Damaged');
create type asset_status as enum ('Available', 'Allocated', 'Reserved', 'Under Maintenance', 'Lost', 'Retired', 'Disposed');
create type allocation_status as enum ('Active', 'Returned', 'Overdue');
create type transfer_status as enum ('Pending', 'Approved', 'Rejected');
create type booking_status as enum ('Upcoming', 'Ongoing', 'Completed', 'Cancelled');
create type maintenance_priority as enum ('Low', 'Medium', 'High', 'Critical');
create type maintenance_status as enum ('Pending', 'Approved', 'Rejected', 'Technician Assigned', 'In Progress', 'Resolved');
create type audit_cycle_status as enum ('Draft', 'Active', 'Completed');
create type audit_verification_status as enum ('Verified', 'Missing', 'Damaged');

-- ==========================================
-- 2. Master Tables
-- ==========================================

-- Departments Table
create table public.departments (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    head_id uuid, -- foreign key references employees(id) added after employees table is created
    parent_department_id uuid references public.departments(id) on delete set null,
    status text not null default 'Active' check (status in ('Active', 'Inactive')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Employees Directory Table
create table public.employees (
    id uuid primary key, -- References auth.users(id) in Supabase Auth
    name text not null,
    email text not null unique,
    department_id uuid references public.departments(id) on delete set null,
    role employee_role not null default 'Employee',
    status text not null default 'Active' check (status in ('Active', 'Inactive')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Now add foreign key constraint on departments pointing to employees
alter table public.departments 
    add constraint fk_departments_head 
    foreign key (head_id) references public.employees(id) on delete set null;

-- Asset Categories Table
create table public.asset_categories (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    custom_fields jsonb default '{}'::jsonb not null, -- Stores category-specific fields (e.g., warranty, mileage)
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Sequence for Asset Tags (e.g., AF-0001, AF-0002)
create sequence asset_tag_seq start with 1;

-- Assets Table
create table public.assets (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    category_id uuid references public.asset_categories(id) on delete restrict,
    asset_tag text not null unique,
    serial_number text,
    acquisition_date date,
    acquisition_cost numeric(12, 2),
    condition asset_condition not null default 'New',
    location text,
    photo_url text,
    documents jsonb default '[]'::jsonb, -- Store list of document metadata / urls
    is_shared boolean not null default false, -- shared / bookable flag
    status asset_status not null default 'Available',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- 3. Transaction Tables
-- ==========================================

-- Allocations Table (Who currently holds what asset)
create table public.allocations (
    id uuid primary key default gen_random_uuid(),
    asset_id uuid not null references public.assets(id) on delete restrict,
    allocated_to_type text not null check (allocated_to_type in ('Employee', 'Department')),
    employee_id uuid references public.employees(id) on delete set null,
    department_id uuid references public.departments(id) on delete set null,
    allocated_by uuid not null references public.employees(id),
    allocated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    expected_return_date date,
    returned_at timestamp with time zone,
    check_in_notes text,
    status allocation_status not null default 'Active',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    constraint check_allocation_target check (
        (allocated_to_type = 'Employee' and employee_id is not null and department_id is null) or
        (allocated_to_type = 'Department' and department_id is not null and employee_id is null)
    )
);

-- Transfers Table (Request transfers between employees)
create table public.transfers (
    id uuid primary key default gen_random_uuid(),
    asset_id uuid not null references public.assets(id) on delete restrict,
    from_employee_id uuid not null references public.employees(id),
    to_employee_id uuid not null references public.employees(id),
    requested_by uuid not null references public.employees(id),
    status transfer_status not null default 'Pending',
    approved_by uuid references public.employees(id),
    approved_at timestamp with time zone,
    rejection_reason text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Resource Bookings Table (For shared/bookable assets)
create table public.bookings (
    id uuid primary key default gen_random_uuid(),
    asset_id uuid not null references public.assets(id) on delete restrict,
    booked_by uuid not null references public.employees(id),
    start_time timestamp with time zone not null,
    end_time timestamp with time zone not null,
    status booking_status not null default 'Upcoming',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    constraint check_booking_times check (start_time < end_time)
);

-- Maintenance Requests Table
create table public.maintenance_requests (
    id uuid primary key default gen_random_uuid(),
    asset_id uuid not null references public.assets(id) on delete restrict,
    requested_by uuid not null references public.employees(id),
    description text not null,
    priority maintenance_priority not null default 'Medium',
    photo_url text,
    status maintenance_status not null default 'Pending',
    assigned_technician text,
    approved_by uuid references public.employees(id),
    resolution_notes text,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Audit Cycles Table
create table public.audit_cycles (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    scope_type text not null check (scope_type in ('Department', 'Location', 'All')),
    scope_department_id uuid references public.departments(id) on delete set null,
    scope_location text,
    start_date date not null,
    end_date date not null,
    status audit_cycle_status not null default 'Draft',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    constraint check_audit_dates check (start_date <= end_date)
);

-- Audit Auditors Junction Table (Many-to-Many)
create table public.audit_auditors (
    audit_cycle_id uuid not null references public.audit_cycles(id) on delete cascade,
    employee_id uuid not null references public.employees(id) on delete cascade,
    primary key (audit_cycle_id, employee_id)
);

-- Audit Results Table
create table public.audit_results (
    id uuid primary key default gen_random_uuid(),
    audit_cycle_id uuid not null references public.audit_cycles(id) on delete cascade,
    asset_id uuid not null references public.assets(id) on delete restrict,
    auditor_id uuid not null references public.employees(id),
    verification_status audit_verification_status not null,
    notes text,
    verified_at timestamp with time zone default timezone('utc'::text, now()) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    constraint unique_audit_asset_cycle unique(audit_cycle_id, asset_id)
);

-- Notifications Table
create table public.notifications (
    id uuid primary key default gen_random_uuid(),
    recipient_id uuid not null references public.employees(id) on delete cascade,
    title text not null,
    message text not null,
    type text not null, -- e.g., 'Asset Assigned', 'Overdue Return', etc.
    is_read boolean not null default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Activity Logs Table (System-wide Audits)
create table public.activity_logs (
    id uuid primary key default gen_random_uuid(),
    actor_id uuid references public.employees(id) on delete set null,
    action text not null, -- e.g., 'Update Department', 'Approve Transfer'
    entity_type text, -- e.g., 'assets', 'departments'
    entity_id uuid,
    details jsonb default '{}'::jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Consolidated Asset History Table
create table public.asset_history (
    id uuid primary key default gen_random_uuid(),
    asset_id uuid not null references public.assets(id) on delete cascade,
    event_type text not null, -- 'Registration', 'Allocation', 'Transfer', 'Return', 'Maintenance', 'Audit', 'Status Change'
    event_date timestamp with time zone default timezone('utc'::text, now()) not null,
    description text not null,
    actor_id uuid references public.employees(id) on delete set null,
    details jsonb default '{}'::jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- 4. Automatically Sync Timestamps Trigger
-- ==========================================
create or replace function public.update_modified_column()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

-- Apply timestamp sync trigger to all tables that have updated_at
create trigger update_departments_modtime before update on public.departments for each row execute procedure public.update_modified_column();
create trigger update_employees_modtime before update on public.employees for each row execute procedure public.update_modified_column();
create trigger update_asset_categories_modtime before update on public.asset_categories for each row execute procedure public.update_modified_column();
create trigger update_assets_modtime before update on public.assets for each row execute procedure public.update_modified_column();
create trigger update_allocations_modtime before update on public.allocations for each row execute procedure public.update_modified_column();
create trigger update_transfers_modtime before update on public.transfers for each row execute procedure public.update_modified_column();
create trigger update_bookings_modtime before update on public.bookings for each row execute procedure public.update_modified_column();
create trigger update_maintenance_requests_modtime before update on public.maintenance_requests for each row execute procedure public.update_modified_column();
create trigger update_audit_cycles_modtime before update on public.audit_cycles for each row execute procedure public.update_modified_column();
create trigger update_audit_results_modtime before update on public.audit_results for each row execute procedure public.update_modified_column();


-- ==========================================
-- 5. Business Logic Triggers & Functions
-- ==========================================

-- A. Auto-Generate Asset Tag Trigger Function
create or replace function public.generate_asset_tag()
returns trigger as $$
begin
    if new.asset_tag is null or new.asset_tag = '' then
        new.asset_tag := 'AF-' || lpad(nextval('public.asset_tag_seq')::text, 4, '0');
    end if;
    return new;
end;
$$ language plpgsql;

create trigger trigger_generate_asset_tag
    before insert on public.assets
    for each row
    execute procedure public.generate_asset_tag();


-- B. Prevent Double-Allocation Conflict Trigger Function
create or replace function public.check_allocation_conflict()
returns trigger as $$
declare
    v_asset_status public.asset_status;
    v_holder_name text;
begin
    -- Fetch target asset status
    select status into v_asset_status from public.assets where id = new.asset_id;
    
    if v_asset_status <> 'Available' then
        -- Find current active holder
        select 
            case 
                when allocated_to_type = 'Employee' then (select name from public.employees where id = employee_id)
                else (select name from public.departments where id = department_id)
            end into v_holder_name
        from public.allocations
        where asset_id = new.asset_id and status = 'Active'
        limit 1;
        
        raise exception 'Allocation rejected. The asset is currently in status "%" and held by "%". A transfer request must be raised.', 
            v_asset_status, coalesce(v_holder_name, 'Unknown');
    end if;
    
    return new;
end;
$$ language plpgsql;

create trigger trigger_check_allocation_conflict
    before insert on public.allocations
    for each row
    when (new.status = 'Active')
    execute procedure public.check_allocation_conflict();


-- C. Update Asset Status on Allocation Events
create or replace function public.handle_allocation_changes()
returns trigger as $$
begin
    if tg_op = 'INSERT' and new.status = 'Active' then
        update public.assets set status = 'Allocated' where id = new.asset_id;
    elsif tg_op = 'UPDATE' then
        if old.status = 'Active' and new.status = 'Returned' then
            update public.assets set status = 'Available' where id = new.asset_id;
        end if;
    end if;
    return new;
end;
$$ language plpgsql;

create trigger trigger_handle_allocation_changes
    after insert or update on public.allocations
    for each row
    execute procedure public.handle_allocation_changes();


-- D. Validate Overlapping Resource Bookings (Shared Assets Only)
create or replace function public.check_booking_overlap()
returns trigger as $$
declare
    v_is_shared boolean;
begin
    select is_shared into v_is_shared from public.assets where id = new.asset_id;
    if not v_is_shared then
        raise exception 'Booking rejected. This asset is not flagged as shared/bookable.';
    end if;

    if exists (
        select 1 from public.bookings
        where asset_id = new.asset_id
          and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
          and status in ('Upcoming', 'Ongoing')
          and start_time < new.end_time
          and end_time > new.start_time
    ) then
        raise exception 'Booking slot overlap detected. The requested time conflicts with an existing booking.';
    end if;
    return new;
end;
$$ language plpgsql;

create trigger trigger_check_booking_overlap
    before insert or update on public.bookings
    for each row
    when (new.status in ('Upcoming', 'Ongoing'))
    execute procedure public.check_booking_overlap();


-- E. Sync Asset Status on Maintenance States
create or replace function public.handle_maintenance_status_change()
returns trigger as $$
begin
    if new.status in ('Approved', 'Technician Assigned', 'In Progress') and old.status = 'Pending' then
        update public.assets set status = 'Under Maintenance' where id = new.asset_id;
    elsif new.status = 'Resolved' and old.status <> 'Resolved' then
        update public.assets set status = 'Available' where id = new.asset_id;
    end if;
    return new;
end;
$$ language plpgsql;

create trigger trigger_handle_maintenance_status_change
    after update on public.maintenance_requests
    for each row
    execute procedure public.handle_maintenance_status_change();


-- F. Sync Asset Status on Closing Audit Cycle
create or replace function public.handle_audit_cycle_closing()
returns trigger as $$
begin
    if new.status = 'Completed' and old.status <> 'Completed' then
        -- Mark confirmed-missing items as 'Lost'
        update public.assets
        set status = 'Lost'
        where id in (
            select asset_id 
            from public.audit_results 
            where audit_cycle_id = new.id and verification_status = 'Missing'
        );
        
        -- Mark verified-damaged items as 'Under Maintenance'
        update public.assets
        set status = 'Under Maintenance'
        where id in (
            select asset_id 
            from public.audit_results 
            where audit_cycle_id = new.id and verification_status = 'Damaged'
        );
    end if;
    return new;
end;
$$ language plpgsql;

create trigger trigger_handle_audit_cycle_closing
    after update on public.audit_cycles
    for each row
    execute procedure public.handle_audit_cycle_closing();


-- G. Automatic Historical Logging (Unified Audit Trail)
create or replace function public.log_asset_history_event()
returns trigger as $$
declare
    v_asset_id uuid;
    v_event_type text;
    v_description text;
    v_actor_id uuid;
    v_details jsonb;
begin
    if tg_table_name = 'allocations' then
        v_asset_id := new.asset_id;
        v_actor_id := new.allocated_by;
        if tg_op = 'INSERT' then
            v_event_type := 'Allocation';
            v_description := 'Asset allocated in active status.';
            v_details := to_jsonb(new);
        elsif tg_op = 'UPDATE' and old.status = 'Active' and new.status = 'Returned' then
            v_event_type := 'Return';
            v_description := 'Asset returned. Condition check-in notes: ' || coalesce(new.check_in_notes, 'None');
            v_details := to_jsonb(new);
        else
            return new;
        end if;
    elsif tg_table_name = 'transfers' then
        v_asset_id := new.asset_id;
        v_actor_id := new.requested_by;
        if tg_op = 'UPDATE' and old.status = 'Pending' and new.status = 'Approved' then
            v_event_type := 'Transfer';
            v_description := 'Transfer request approved. Transferred to employee ID ' || new.to_employee_id;
            v_details := to_jsonb(new);
        else
            return new;
        end if;
    elsif tg_table_name = 'maintenance_requests' then
        v_asset_id := new.asset_id;
        v_actor_id := new.requested_by;
        if tg_op = 'INSERT' then
            v_event_type := 'Maintenance';
            v_description := 'Maintenance request filed: ' || new.description;
            v_details := to_jsonb(new);
        elsif tg_op = 'UPDATE' and old.status <> 'Resolved' and new.status = 'Resolved' then
            v_event_type := 'Maintenance';
            v_description := 'Maintenance request resolved: ' || coalesce(new.resolution_notes, 'None');
            v_details := to_jsonb(new);
        else
            return new;
        end if;
    elsif tg_table_name = 'audit_results' then
        v_asset_id := new.asset_id;
        v_actor_id := new.auditor_id;
        v_event_type := 'Audit';
        v_description := 'Verified status: ' || new.verification_status || '. Notes: ' || coalesce(new.notes, 'None');
        v_details := to_jsonb(new);
    else
        return new;
    end if;

    insert into public.asset_history (asset_id, event_type, event_date, description, actor_id, details)
    values (v_asset_id, v_event_type, now(), v_description, v_actor_id, v_details);

    return new;
end;
$$ language plpgsql;

create trigger trigger_log_allocation_history after insert or update on public.allocations for each row execute procedure public.log_asset_history_event();
create trigger trigger_log_transfer_history after update on public.transfers for each row execute procedure public.log_asset_history_event();
create trigger trigger_log_maintenance_history after insert or update on public.maintenance_requests for each row execute procedure public.log_asset_history_event();
create trigger trigger_log_audit_history after insert or update on public.audit_results for each row execute procedure public.log_asset_history_event();


-- ==========================================
-- 6. Supabase Auth Linkage Trigger
-- ==========================================
-- This database trigger automatically adds a record to the public.employees table when a user registers on Supabase Auth.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.employees (id, name, email, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'New Employee'),
    new.email,
    'Employee',
    'Active'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ==========================================
-- 7. Views for Reporting & Analytics
-- ==========================================

-- Dashboard Metrics View (for single-query metric fetching)
create or replace view public.dashboard_metrics_view as
select
    (select count(*) from public.assets where status = 'Available') as assets_available,
    (select count(*) from public.assets where status = 'Allocated') as assets_allocated,
    (select count(*) from public.maintenance_requests where status in ('Approved', 'Technician Assigned', 'In Progress')) as maintenance_active_today,
    (select count(*) from public.bookings where status = 'Ongoing') as active_bookings,
    (select count(*) from public.transfers where status = 'Pending') as pending_transfers,
    (select count(*) from public.allocations where status = 'Active' and expected_return_date >= current_date and expected_return_date <= current_date + interval '7 days') as upcoming_returns,
    (select count(*) from public.allocations where status = 'Active' and expected_return_date < current_date) as overdue_returns;


-- ==========================================
-- 8. Indexes for Optimization
-- ==========================================
create index idx_employees_department on public.employees(department_id);
create index idx_assets_category on public.assets(category_id);
create index idx_assets_status on public.assets(status);
create index idx_assets_tag on public.assets(asset_tag);
create index idx_allocations_asset_status on public.allocations(asset_id, status);
create index idx_allocations_employee on public.allocations(employee_id);
create index idx_allocations_department on public.allocations(department_id);
create index idx_bookings_asset_dates on public.bookings(asset_id, start_time, end_time);
create index idx_maintenance_asset_status on public.maintenance_requests(asset_id, status);
create index idx_audit_results_cycle on public.audit_results(audit_cycle_id);
create index idx_asset_history_asset on public.asset_history(asset_id);
create index idx_notifications_recipient on public.notifications(recipient_id, is_read);
