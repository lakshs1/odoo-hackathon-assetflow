import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase';

// Types
export interface Employee {
  id: string;
  name: string;
  email: string;
  department_id: string | null;
  role: 'Admin' | 'Asset Manager' | 'Department Head' | 'Employee';
  status: 'Active' | 'Inactive';
}

export interface Department {
  id: string;
  name: string;
  head_id: string | null;
  parent_department_id: string | null;
  status: 'Active' | 'Inactive';
}

export interface AssetCategory {
  id: string;
  name: string;
  custom_fields: Record<string, string>;
}

export interface Asset {
  id: string;
  name: string;
  category_id: string;
  asset_tag: string;
  serial_number: string;
  acquisition_date: string;
  acquisition_cost: number;
  condition: 'New' | 'Good' | 'Fair' | 'Poor' | 'Damaged';
  location: string;
  photo_url: string;
  documents: Array<{ name: string; url: string }>;
  is_shared: boolean;
  status: 'Available' | 'Allocated' | 'Reserved' | 'Under Maintenance' | 'Lost' | 'Retired' | 'Disposed';
  custom_fields?: Record<string, string>;
}

export interface Allocation {
  id: string;
  asset_id: string;
  allocated_to_type: 'Employee' | 'Department';
  employee_id: string | null;
  department_id: string | null;
  allocated_by: string;
  allocated_at: string;
  expected_return_date: string | null;
  returned_at: string | null;
  check_in_notes: string | null;
  status: 'Active' | 'Returned' | 'Overdue';
}

export interface Transfer {
  id: string;
  asset_id: string;
  from_employee_id: string;
  to_employee_id: string;
  requested_by: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  asset_id: string;
  booked_by: string;
  start_time: string;
  end_time: string;
  status: 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled';
}

export interface MaintenanceRequest {
  id: string;
  asset_id: string;
  requested_by: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  photo_url: string | null;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Technician Assigned' | 'In Progress' | 'Resolved';
  assigned_technician: string | null;
  approved_by: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface AuditCycle {
  id: string;
  name: string;
  scope_type: 'Department' | 'Location' | 'All';
  scope_department_id: string | null;
  scope_location: string | null;
  start_date: string;
  end_date: string;
  status: 'Draft' | 'Active' | 'Completed';
}

export interface AuditResult {
  id: string;
  audit_cycle_id: string;
  asset_id: string;
  auditor_id: string;
  verification_status: 'Verified' | 'Missing' | 'Damaged';
  notes: string | null;
  verified_at: string;
}

export interface Notification {
  id: string;
  recipient_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: any;
  created_at: string;
}

export interface AssetHistory {
  id: string;
  asset_id: string;
  event_type: 'Registration' | 'Allocation' | 'Transfer' | 'Return' | 'Maintenance' | 'Audit' | 'Status Change';
  event_date: string;
  description: string;
  actor_id: string;
  details: any;
}

// Initial high-fidelity Mock Data for out-of-the-box local testing
const initialMockEmployees: Employee[] = [
  { id: 'emp-1', name: 'Priya Sharma', email: 'priya@assetflow.com', department_id: 'dept-1', role: 'Employee', status: 'Active' },
  { id: 'emp-2', name: 'Raj Patel', email: 'raj@assetflow.com', department_id: 'dept-1', role: 'Employee', status: 'Active' },
  { id: 'emp-3', name: 'Vikram Mehta', email: 'vikram@assetflow.com', department_id: 'dept-2', role: 'Department Head', status: 'Active' },
  { id: 'emp-4', name: 'Sarah Jenkins', email: 'sarah@assetflow.com', department_id: null, role: 'Asset Manager', status: 'Active' },
  { id: 'emp-5', name: 'Laksh Admin', email: 'admin@assetflow.com', department_id: null, role: 'Admin', status: 'Active' },
];

const initialMockDepartments: Department[] = [
  { id: 'dept-1', name: 'Engineering', head_id: 'emp-3', parent_department_id: null, status: 'Active' },
  { id: 'dept-2', name: 'Design', head_id: 'emp-3', parent_department_id: null, status: 'Active' },
  { id: 'dept-3', name: 'Operations', head_id: null, parent_department_id: null, status: 'Active' },
];

const initialMockCategories: AssetCategory[] = [
  { id: 'cat-1', name: 'Electronics', custom_fields: { warranty: 'Warranty Period (Months)', processor: 'Processor Type' } },
  { id: 'cat-2', name: 'Furniture', custom_fields: { material: 'Material', dimensions: 'Dimensions' } },
  { id: 'cat-3', name: 'Vehicles', custom_fields: { mileage: 'Mileage Limit', fuelType: 'Fuel Type' } },
];

const initialMockAssets: Asset[] = [
  { id: 'asset-1', name: 'MacBook Pro 16"', category_id: 'cat-1', asset_tag: 'AF-0114', serial_number: 'C02DFGH1Q05D', acquisition_date: '2025-01-15', acquisition_cost: 2499, condition: 'New', location: 'HQ - Floor 3', photo_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=300&q=80', documents: [], is_shared: false, status: 'Allocated' },
  { id: 'asset-2', name: 'Dell XPS 15', category_id: 'cat-1', asset_tag: 'AF-0115', serial_number: 'DELL7728XPS', acquisition_date: '2025-02-10', acquisition_cost: 1899, condition: 'Good', location: 'HQ - Floor 3', photo_url: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=300&q=80', documents: [], is_shared: false, status: 'Available' },
  { id: 'asset-3', name: 'Conference Room Alpha', category_id: 'cat-2', asset_tag: 'AF-2001', serial_number: 'ROOM-CONF-A', acquisition_date: '2024-05-01', acquisition_cost: 8000, condition: 'Good', location: 'HQ - Floor 1', photo_url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=300&q=80', documents: [], is_shared: true, status: 'Available' },
  { id: 'asset-4', name: 'Company SUV (Tesla Y)', category_id: 'cat-3', asset_tag: 'AF-3001', serial_number: 'TESLA-MODELY-1', acquisition_date: '2024-10-12', acquisition_cost: 45000, condition: 'New', location: 'Parking B', photo_url: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=300&q=80', documents: [], is_shared: true, status: 'Available' },
  { id: 'asset-5', name: 'Ergonomic Desk Chair', category_id: 'cat-2', asset_tag: 'AF-0012', serial_number: 'CHAIR-STEELCASE-1', acquisition_date: '2024-03-20', acquisition_cost: 850, condition: 'Fair', location: 'HQ - Floor 2', photo_url: 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&w=300&q=80', documents: [], is_shared: false, status: 'Allocated' },
];

const initialMockAllocations: Allocation[] = [
  { id: 'alloc-1', asset_id: 'asset-1', allocated_to_type: 'Employee', employee_id: 'emp-1', department_id: null, allocated_by: 'emp-4', allocated_at: '2025-01-16T10:00:00Z', expected_return_date: '2026-06-30', returned_at: null, check_in_notes: null, status: 'Active' },
  { id: 'alloc-2', asset_id: 'asset-5', allocated_to_type: 'Employee', employee_id: 'emp-2', department_id: null, allocated_by: 'emp-4', allocated_at: '2024-03-22T09:00:00Z', expected_return_date: '2025-03-22', returned_at: null, check_in_notes: null, status: 'Overdue' },
];

interface AppContextType {
  isLinked: boolean;
  currentRole: 'Admin' | 'Asset Manager' | 'Department Head' | 'Employee';
  currentEmployee: Employee;
  employees: Employee[];
  departments: Department[];
  categories: AssetCategory[];
  assets: Asset[];
  allocations: Allocation[];
  transfers: Transfer[];
  bookings: Booking[];
  maintenanceRequests: MaintenanceRequest[];
  auditCycles: AuditCycle[];
  auditResults: AuditResult[];
  notifications: Notification[];
  logs: ActivityLog[];
  history: AssetHistory[];
  
  switchRole: (role: 'Admin' | 'Asset Manager' | 'Department Head' | 'Employee') => void;
  registerAsset: (data: Partial<Asset>) => Promise<void>;
  allocateAsset: (data: Partial<Allocation>) => Promise<{ success: boolean; error?: string; holderName?: string }>;
  requestTransfer: (data: Partial<Transfer>) => Promise<void>;
  approveTransfer: (id: string) => Promise<void>;
  rejectTransfer: (id: string, reason: string) => Promise<void>;
  returnAsset: (id: string, notes: string, condition: any) => Promise<void>;
  createBooking: (data: Partial<Booking>) => Promise<{ success: boolean; error?: string }>;
  cancelBooking: (id: string) => Promise<void>;
  raiseMaintenance: (data: Partial<MaintenanceRequest>) => Promise<void>;
  approveMaintenance: (id: string) => Promise<void>;
  rejectMaintenance: (id: string) => Promise<void>;
  assignTechnician: (id: string, technician: string) => Promise<void>;
  resolveMaintenance: (id: string, notes: string) => Promise<void>;
  createAuditCycle: (data: Partial<AuditCycle>, auditors: string[]) => Promise<void>;
  submitAuditResult: (data: Partial<AuditResult>) => Promise<void>;
  closeAuditCycle: (id: string) => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;
  addCustomDepartment: (data: Partial<Department>) => Promise<void>;
  addCustomCategory: (data: Partial<AssetCategory>) => Promise<void>;
  promoteEmployee: (empId: string, role: any) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isLinked = isSupabaseConfigured();
  
  // App Roles & Auth state
  const [currentRole, setCurrentRole] = useState<'Admin' | 'Asset Manager' | 'Department Head' | 'Employee'>('Admin');
  const [currentEmployee, setCurrentEmployee] = useState<Employee>(initialMockEmployees[4]); // Defaults to Admin Laksh

  // Central DB States (Initialized with Mock fallback)
  const [employees, setEmployees] = useState<Employee[]>(initialMockEmployees);
  const [departments, setDepartments] = useState<Department[]>(initialMockDepartments);
  const [categories, setCategories] = useState<AssetCategory[]>(initialMockCategories);
  const [assets, setAssets] = useState<Asset[]>(initialMockAssets);
  const [allocations, setAllocations] = useState<Allocation[]>(initialMockAllocations);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [auditCycles, setAuditCycles] = useState<AuditCycle[]>([]);
  const [auditResults, setAuditResults] = useState<AuditResult[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [history, setHistory] = useState<AssetHistory[]>([]);

  // Update current employee when role switches
  const switchRole = (role: 'Admin' | 'Asset Manager' | 'Department Head' | 'Employee') => {
    setCurrentRole(role);
    const matched = employees.find(e => e.role === role);
    if (matched) {
      setCurrentEmployee(matched);
    } else {
      // Create template user
      const tempEmp: Employee = {
        id: `emp-temp-${role.toLowerCase()}`,
        name: `Mock ${role}`,
        email: `${role.toLowerCase().replace(' ', '')}@assetflow.com`,
        department_id: role === 'Department Head' ? 'dept-1' : null,
        role: role,
        status: 'Active'
      };
      setEmployees(prev => [...prev, tempEmp]);
      setCurrentEmployee(tempEmp);
    }
  };

  // Sync with Supabase if Linked
  useEffect(() => {
    if (!isLinked) {
      // Add default initial history and logs for mock
      setLogs([{
        id: 'log-1',
        actor_id: 'emp-5',
        action: 'System Init',
        entity_type: 'system',
        entity_id: '0000',
        details: { message: 'AssetFlow initialized in Sandbox Demo mode.' },
        created_at: new Date().toISOString()
      }]);
      return;
    }

    const fetchData = async () => {
      try {
        const { data: empData } = await supabase.from('employees').select('*');
        if (empData) setEmployees(empData);
        
        const { data: deptData } = await supabase.from('departments').select('*');
        if (deptData) setDepartments(deptData);

        const { data: catData } = await supabase.from('asset_categories').select('*');
        if (catData) setCategories(catData);

        const { data: assetData } = await supabase.from('assets').select('*');
        if (assetData) setAssets(assetData);

        const { data: allocData } = await supabase.from('allocations').select('*');
        if (allocData) setAllocations(allocData);

        const { data: transData } = await supabase.from('transfers').select('*');
        if (transData) setTransfers(transData);

        const { data: bookData } = await supabase.from('bookings').select('*');
        if (bookData) setBookings(bookData);

        const { data: maintData } = await supabase.from('maintenance_requests').select('*');
        if (maintData) setMaintenanceRequests(maintData);

        const { data: auditData } = await supabase.from('audit_cycles').select('*');
        if (auditData) setAuditCycles(auditData);

        const { data: auditRes } = await supabase.from('audit_results').select('*');
        if (auditRes) setAuditResults(auditRes);

        const { data: notifData } = await supabase.from('notifications').select('*');
        if (notifData) setNotifications(notifData);

        const { data: logData } = await supabase.from('activity_logs').select('*');
        if (logData) setLogs(logData);

        const { data: histData } = await supabase.from('asset_history').select('*');
        if (histData) setHistory(histData);
      } catch (err) {
        console.error("Error loading data from Supabase:", err);
      }
    };

    fetchData();
  }, [isLinked]);

  // Operations
  const registerAsset = async (data: Partial<Asset>) => {
    const nextSeq = assets.length + 1;
    const tag = `AF-${String(nextSeq).padStart(4, '0')}`;
    const newAsset: Asset = {
      id: crypto.randomUUID(),
      name: data.name || '',
      category_id: data.category_id || '',
      asset_tag: tag,
      serial_number: data.serial_number || '',
      acquisition_date: data.acquisition_date || new Date().toISOString().split('T')[0],
      acquisition_cost: Number(data.acquisition_cost) || 0,
      condition: data.condition || 'New',
      location: data.location || '',
      photo_url: data.photo_url || 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?auto=format&fit=crop&w=300&q=80',
      documents: data.documents || [],
      is_shared: !!data.is_shared,
      status: 'Available'
    };

    if (isLinked) {
      await supabase.from('assets').insert([newAsset]);
    } else {
      setAssets(prev => [...prev, newAsset]);
      // Log event
      setHistory(prev => [...prev, {
        id: crypto.randomUUID(),
        asset_id: newAsset.id,
        event_type: 'Registration',
        event_date: new Date().toISOString(),
        description: `Asset registered with Tag ${newAsset.asset_tag}`,
        actor_id: currentEmployee.id,
        details: newAsset
      }]);
      setLogs(prev => [...prev, {
        id: crypto.randomUUID(),
        actor_id: currentEmployee.id,
        action: 'Asset Registered',
        entity_type: 'assets',
        entity_id: newAsset.id,
        details: { name: newAsset.name, tag: newAsset.asset_tag },
        created_at: new Date().toISOString()
      }]);
    }
  };

  const allocateAsset = async (data: Partial<Allocation>) => {
    // Conflict rules check:
    const targetAsset = assets.find(a => a.id === data.asset_id);
    if (!targetAsset) return { success: false, error: 'Asset not found.' };

    if (targetAsset.status !== 'Available') {
      // Find current holder
      const currentAlloc = allocations.find(a => a.asset_id === data.asset_id && a.status === 'Active');
      let holder = 'Unknown';
      if (currentAlloc) {
        if (currentAlloc.allocated_to_type === 'Employee') {
          holder = employees.find(e => e.id === currentAlloc.employee_id)?.name || 'Employee';
        } else {
          holder = departments.find(d => d.id === currentAlloc.department_id)?.name || 'Department';
        }
      }
      return { 
        success: false, 
        error: `Conflict: Asset is currently ${targetAsset.status} and held by ${holder}.`,
        holderName: holder
      };
    }

    const newAlloc: Allocation = {
      id: crypto.randomUUID(),
      asset_id: data.asset_id || '',
      allocated_to_type: data.allocated_to_type || 'Employee',
      employee_id: data.employee_id || null,
      department_id: data.department_id || null,
      allocated_by: currentEmployee.id,
      allocated_at: new Date().toISOString(),
      expected_return_date: data.expected_return_date || null,
      returned_at: null,
      check_in_notes: null,
      status: 'Active'
    };

    if (isLinked) {
      const { error } = await supabase.from('allocations').insert([newAlloc]);
      if (error) return { success: false, error: error.message };
    } else {
      setAllocations(prev => [...prev, newAlloc]);
      setAssets(prev => prev.map(a => a.id === newAlloc.asset_id ? { ...a, status: 'Allocated' } : a));
      
      setHistory(prev => [...prev, {
        id: crypto.randomUUID(),
        asset_id: newAlloc.asset_id,
        event_type: 'Allocation',
        event_date: new Date().toISOString(),
        description: `Allocated to ${newAlloc.allocated_to_type === 'Employee' ? 'Employee' : 'Department'}`,
        actor_id: currentEmployee.id,
        details: newAlloc
      }]);
    }
    return { success: true };
  };

  const requestTransfer = async (data: Partial<Transfer>) => {
    const newTransfer: Transfer = {
      id: crypto.randomUUID(),
      asset_id: data.asset_id || '',
      from_employee_id: data.from_employee_id || '',
      to_employee_id: data.to_employee_id || '',
      requested_by: currentEmployee.id,
      status: 'Pending',
      approved_by: null,
      approved_at: null,
      rejection_reason: null,
      created_at: new Date().toISOString()
    };

    if (isLinked) {
      await supabase.from('transfers').insert([newTransfer]);
    } else {
      setTransfers(prev => [...prev, newTransfer]);
      // Trigger notification for Asset Manager / Dept Head
      const managers = employees.filter(e => e.role === 'Asset Manager' || e.role === 'Department Head');
      managers.forEach(mgr => {
        setNotifications(prev => [...prev, {
          id: crypto.randomUUID(),
          recipient_id: mgr.id,
          title: 'Transfer Request Raised',
          message: `${currentEmployee.name} is requesting transfer of asset ${assets.find(a => a.id === data.asset_id)?.name}.`,
          type: 'Transfer Requested',
          is_read: false,
          created_at: new Date().toISOString()
        }]);
      });
    }
  };

  const approveTransfer = async (id: string) => {
    const transfer = transfers.find(t => t.id === id);
    if (!transfer) return;

    if (isLinked) {
      await supabase.from('transfers').update({
        status: 'Approved',
        approved_by: currentEmployee.id,
        approved_at: new Date().toISOString()
      }).eq('id', id);
    } else {
      setTransfers(prev => prev.map(t => t.id === id ? { ...t, status: 'Approved', approved_by: currentEmployee.id, approved_at: new Date().toISOString() } : t));
      
      // End active allocation, build a new one
      setAllocations(prev => prev.map(a => a.asset_id === transfer.asset_id && a.status === 'Active' ? { ...a, status: 'Returned', returned_at: new Date().toISOString(), check_in_notes: 'Returned via transfer' } : a));
      
      const newAlloc: Allocation = {
        id: crypto.randomUUID(),
        asset_id: transfer.asset_id,
        allocated_to_type: 'Employee',
        employee_id: transfer.to_employee_id,
        department_id: null,
        allocated_by: currentEmployee.id,
        allocated_at: new Date().toISOString(),
        expected_return_date: null,
        returned_at: null,
        check_in_notes: null,
        status: 'Active'
      };
      setAllocations(prev => [...prev, newAlloc]);
      
      setHistory(prev => [...prev, {
        id: crypto.randomUUID(),
        asset_id: transfer.asset_id,
        event_type: 'Transfer',
        event_date: new Date().toISOString(),
        description: `Transfer approved. Transferred to ${employees.find(e => e.id === transfer.to_employee_id)?.name}`,
        actor_id: currentEmployee.id,
        details: transfer
      }]);
    }
  };

  const rejectTransfer = async (id: string, reason: string) => {
    if (isLinked) {
      await supabase.from('transfers').update({
        status: 'Rejected',
        rejection_reason: reason
      }).eq('id', id);
    } else {
      setTransfers(prev => prev.map(t => t.id === id ? { ...t, status: 'Rejected', rejection_reason: reason } : t));
    }
  };

  const returnAsset = async (allocationId: string, notes: string, condition: any) => {
    const alloc = allocations.find(a => a.id === allocationId);
    if (!alloc) return;

    if (isLinked) {
      await supabase.from('allocations').update({
        status: 'Returned',
        returned_at: new Date().toISOString(),
        check_in_notes: notes
      }).eq('id', allocationId);
      
      await supabase.from('assets').update({
        status: 'Available',
        condition: condition
      }).eq('id', alloc.asset_id);
    } else {
      setAllocations(prev => prev.map(a => a.id === allocationId ? { ...a, status: 'Returned', returned_at: new Date().toISOString(), check_in_notes: notes } : a));
      setAssets(prev => prev.map(a => a.id === alloc.asset_id ? { ...a, status: 'Available', condition: condition } : a));
      
      setHistory(prev => [...prev, {
        id: crypto.randomUUID(),
        asset_id: alloc.asset_id,
        event_type: 'Return',
        event_date: new Date().toISOString(),
        description: `Asset returned. Notes: ${notes}. Condition check-in: ${condition}`,
        actor_id: currentEmployee.id,
        details: { notes, condition }
      }]);
    }
  };

  const createBooking = async (data: Partial<Booking>) => {
    // Check overlap:
    const overlaps = bookings.filter(b => 
      b.asset_id === data.asset_id &&
      b.status !== 'Cancelled' &&
      new Date(b.start_time) < new Date(data.end_time || '') &&
      new Date(b.end_time) > new Date(data.start_time || '')
    );

    if (overlaps.length > 0) {
      return { success: false, error: 'Time Slot Conflict: This asset is already booked during this time.' };
    }

    const newBooking: Booking = {
      id: crypto.randomUUID(),
      asset_id: data.asset_id || '',
      booked_by: currentEmployee.id,
      start_time: data.start_time || '',
      end_time: data.end_time || '',
      status: 'Upcoming'
    };

    if (isLinked) {
      const { error } = await supabase.from('bookings').insert([newBooking]);
      if (error) return { success: false, error: error.message };
    } else {
      setBookings(prev => [...prev, newBooking]);
    }
    return { success: true };
  };

  const cancelBooking = async (id: string) => {
    if (isLinked) {
      await supabase.from('bookings').update({ status: 'Cancelled' }).eq('id', id);
    } else {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'Cancelled' } : b));
    }
  };

  const raiseMaintenance = async (data: Partial<MaintenanceRequest>) => {
    const newReq: MaintenanceRequest = {
      id: crypto.randomUUID(),
      asset_id: data.asset_id || '',
      requested_by: currentEmployee.id,
      description: data.description || '',
      priority: data.priority || 'Medium',
      photo_url: data.photo_url || null,
      status: 'Pending',
      assigned_technician: null,
      approved_by: null,
      resolution_notes: null,
      resolved_at: null,
      created_at: new Date().toISOString()
    };

    if (isLinked) {
      await supabase.from('maintenance_requests').insert([newReq]);
    } else {
      setMaintenanceRequests(prev => [...prev, newReq]);
      
      setHistory(prev => [...prev, {
        id: crypto.randomUUID(),
        asset_id: newReq.asset_id,
        event_type: 'Maintenance',
        event_date: new Date().toISOString(),
        description: `Maintenance request raised: ${newReq.description}`,
        actor_id: currentEmployee.id,
        details: newReq
      }]);
    }
  };

  const approveMaintenance = async (id: string) => {
    const req = maintenanceRequests.find(r => r.id === id);
    if (!req) return;

    if (isLinked) {
      await supabase.from('maintenance_requests').update({
        status: 'Approved',
        approved_by: currentEmployee.id
      }).eq('id', id);
    } else {
      setMaintenanceRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Approved', approved_by: currentEmployee.id } : r));
      setAssets(prev => prev.map(a => a.id === req.asset_id ? { ...a, status: 'Under Maintenance' } : a));
    }
  };

  const rejectMaintenance = async (id: string) => {
    if (isLinked) {
      await supabase.from('maintenance_requests').update({
        status: 'Rejected',
        approved_by: currentEmployee.id
      }).eq('id', id);
    } else {
      setMaintenanceRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Rejected', approved_by: currentEmployee.id } : r));
    }
  };

  const assignTechnician = async (id: string, technician: string) => {
    if (isLinked) {
      await supabase.from('maintenance_requests').update({
        status: 'Technician Assigned',
        assigned_technician: technician
      }).eq('id', id);
    } else {
      setMaintenanceRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Technician Assigned', assigned_technician: technician } : r));
    }
  };

  const resolveMaintenance = async (id: string, notes: string) => {
    const req = maintenanceRequests.find(r => r.id === id);
    if (!req) return;

    if (isLinked) {
      await supabase.from('maintenance_requests').update({
        status: 'Resolved',
        resolution_notes: notes,
        resolved_at: new Date().toISOString()
      }).eq('id', id);
    } else {
      setMaintenanceRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Resolved', resolution_notes: notes, resolved_at: new Date().toISOString() } : r));
      setAssets(prev => prev.map(a => a.id === req.asset_id ? { ...a, status: 'Available' } : a));
      
      setHistory(prev => [...prev, {
        id: crypto.randomUUID(),
        asset_id: req.asset_id,
        event_type: 'Maintenance',
        event_date: new Date().toISOString(),
        description: `Maintenance complete. Notes: ${notes}`,
        actor_id: currentEmployee.id,
        details: { notes }
      }]);
    }
  };

  const createAuditCycle = async (data: Partial<AuditCycle>, auditorIds: string[]) => {
    const newCycle: AuditCycle = {
      id: crypto.randomUUID(),
      name: data.name || '',
      scope_type: data.scope_type || 'All',
      scope_department_id: data.scope_department_id || null,
      scope_location: data.scope_location || null,
      start_date: data.start_date || '',
      end_date: data.end_date || '',
      status: 'Draft'
    };

    if (isLinked) {
      await supabase.from('audit_cycles').insert([newCycle]);
      // Junction inserts for auditors
      const inserts = auditorIds.map(auditor_id => ({ audit_cycle_id: newCycle.id, employee_id: auditor_id }));
      await supabase.from('audit_auditors').insert(inserts);
    } else {
      setAuditCycles(prev => [...prev, newCycle]);
      
      // Notify assigned auditors
      auditorIds.forEach(id => {
        setNotifications(prev => [...prev, {
          id: crypto.randomUUID(),
          recipient_id: id,
          title: 'Assigned as Auditor',
          message: `You have been assigned to audit cycle: ${newCycle.name}`,
          type: 'Audit Assigned',
          is_read: false,
          created_at: new Date().toISOString()
        }]);
      });
    }
  };

  const submitAuditResult = async (data: Partial<AuditResult>) => {
    const newResult: AuditResult = {
      id: crypto.randomUUID(),
      audit_cycle_id: data.audit_cycle_id || '',
      asset_id: data.asset_id || '',
      auditor_id: currentEmployee.id,
      verification_status: data.verification_status || 'Verified',
      notes: data.notes || null,
      verified_at: new Date().toISOString()
    };

    if (isLinked) {
      await supabase.from('audit_results').insert([newResult]);
    } else {
      setAuditResults(prev => [...prev.filter(r => !(r.audit_cycle_id === newResult.audit_cycle_id && r.asset_id === newResult.asset_id)), newResult]);
      
      setHistory(prev => [...prev, {
        id: crypto.randomUUID(),
        asset_id: newResult.asset_id,
        event_type: 'Audit',
        event_date: new Date().toISOString(),
        description: `Audited. Result: ${newResult.verification_status}. Notes: ${newResult.notes}`,
        actor_id: currentEmployee.id,
        details: newResult
      }]);
    }
  };

  const closeAuditCycle = async (id: string) => {
    if (isLinked) {
      await supabase.from('audit_cycles').update({ status: 'Completed' }).eq('id', id);
    } else {
      setAuditCycles(prev => prev.map(c => c.id === id ? { ...c, status: 'Completed' } : c));
      
      // Fetch results of this cycle
      const cycleResults = auditResults.filter(r => r.audit_cycle_id === id);
      cycleResults.forEach(res => {
        if (res.verification_status === 'Missing') {
          setAssets(prev => prev.map(a => a.id === res.asset_id ? { ...a, status: 'Lost' } : a));
        } else if (res.verification_status === 'Damaged') {
          setAssets(prev => prev.map(a => a.id === res.asset_id ? { ...a, status: 'Under Maintenance' } : a));
        }
      });
    }
  };

  const dismissNotification = async (id: string) => {
    if (isLinked) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    } else {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    }
  };

  const addCustomDepartment = async (data: Partial<Department>) => {
    const newDept: Department = {
      id: crypto.randomUUID(),
      name: data.name || '',
      head_id: data.head_id || null,
      parent_department_id: data.parent_department_id || null,
      status: 'Active'
    };
    if (isLinked) {
      await supabase.from('departments').insert([newDept]);
    } else {
      setDepartments(prev => [...prev, newDept]);
    }
  };

  const addCustomCategory = async (data: Partial<AssetCategory>) => {
    const newCat: AssetCategory = {
      id: crypto.randomUUID(),
      name: data.name || '',
      custom_fields: data.custom_fields || {}
    };
    if (isLinked) {
      await supabase.from('asset_categories').insert([newCat]);
    } else {
      setCategories(prev => [...prev, newCat]);
    }
  };

  const promoteEmployee = async (empId: string, role: any) => {
    if (isLinked) {
      await supabase.from('employees').update({ role }).eq('id', empId);
    } else {
      setEmployees(prev => prev.map(e => e.id === empId ? { ...e, role } : e));
    }
  };

  return (
    <AppContext.Provider value={{
      isLinked,
      currentRole,
      currentEmployee,
      employees,
      departments,
      categories,
      assets,
      allocations,
      transfers,
      bookings,
      maintenanceRequests,
      auditCycles,
      auditResults,
      notifications,
      logs,
      history,
      
      switchRole,
      registerAsset,
      allocateAsset,
      requestTransfer,
      approveTransfer,
      rejectTransfer,
      returnAsset,
      createBooking,
      cancelBooking,
      raiseMaintenance,
      approveMaintenance,
      rejectMaintenance,
      assignTechnician,
      resolveMaintenance,
      createAuditCycle,
      submitAuditResult,
      closeAuditCycle,
      dismissNotification,
      addCustomDepartment,
      addCustomCategory,
      promoteEmployee
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
};
