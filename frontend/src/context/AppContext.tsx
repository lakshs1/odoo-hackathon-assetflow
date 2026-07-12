import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { api } from '../lib/api';

const ROLE = {
  ADMIN: 'Admin',
  ASSET_MANAGER: 'Asset Manager',
  DEPARTMENT_HEAD: 'Department Head',
  EMPLOYEE: 'Employee',
} as const;

const ASSET_STATE = {
  AVAILABLE: 'Available',
  ALLOCATED: 'Allocated',
  RESERVED: 'Reserved',
  UNDER_MAINTENANCE: 'Under Maintenance',
  LOST: 'Lost',
  RETIRED: 'Retired',
  DISPOSED: 'Disposed',
} as const;

const ALLOCATION_STATE = {
  ACTIVE: 'Active',
  RETURNED: 'Returned',
  OVERDUE: 'Overdue',
} as const;

const TRANSFER_STATE = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
} as const;

const BOOKING_STATE = {
  UPCOMING: 'Upcoming',
  ONGOING: 'Ongoing',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
} as const;

const MAINTENANCE_STATE = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  TECHNICIAN_ASSIGNED: 'Technician Assigned',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
} as const;

const AUDIT_STATE = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
} as const;

const AUDIT_RESULT_STATE = {
  VERIFIED: 'Verified',
  MISSING: 'Missing',
  DAMAGED: 'Damaged',
} as const;

type Role = (typeof ROLE)[keyof typeof ROLE];
type AssetStatus = (typeof ASSET_STATE)[keyof typeof ASSET_STATE];
type AllocationStatus = (typeof ALLOCATION_STATE)[keyof typeof ALLOCATION_STATE];
type TransferStatus = (typeof TRANSFER_STATE)[keyof typeof TRANSFER_STATE];
type BookingStatus = (typeof BOOKING_STATE)[keyof typeof BOOKING_STATE];
type MaintenanceStatus = (typeof MAINTENANCE_STATE)[keyof typeof MAINTENANCE_STATE];
type AuditStatus = (typeof AUDIT_STATE)[keyof typeof AUDIT_STATE];
type AuditVerificationStatus = (typeof AUDIT_RESULT_STATE)[keyof typeof AUDIT_RESULT_STATE];

export interface Employee {
  id: string;
  userId?: string;
  name: string;
  email: string;
  department_id: string | null;
  role: Role;
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
  status: AssetStatus;
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
  status: AllocationStatus;
}

export interface Transfer {
  id: string;
  asset_id: string;
  from_employee_id: string;
  to_employee_id: string;
  requested_by: string;
  status: TransferStatus;
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
  status: BookingStatus;
}

export interface MaintenanceRequest {
  id: string;
  asset_id: string;
  requested_by: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  photo_url: string | null;
  status: MaintenanceStatus;
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
  status: AuditStatus;
}

export interface AuditResult {
  id: string;
  audit_cycle_id: string;
  asset_id: string;
  auditor_id: string;
  verification_status: AuditVerificationStatus;
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
  details: unknown;
  created_at: string;
}

export interface AssetHistory {
  id: string;
  asset_id: string;
  event_type: 'Registration' | 'Allocation' | 'Transfer' | 'Return' | 'Maintenance' | 'Audit' | 'Status Change';
  event_date: string;
  description: string;
  actor_id: string;
  details: unknown;
}

const initialMockEmployees: Employee[] = [
  { id: 'emp-1', name: 'Priya Sharma', email: 'priya@assetflow.com', department_id: 'dept-1', role: ROLE.EMPLOYEE, status: 'Active' },
  { id: 'emp-2', name: 'Raj Patel', email: 'raj@assetflow.com', department_id: 'dept-1', role: ROLE.EMPLOYEE, status: 'Active' },
  { id: 'emp-3', name: 'Vikram Mehta', email: 'vikram@assetflow.com', department_id: 'dept-2', role: ROLE.DEPARTMENT_HEAD, status: 'Active' },
  { id: 'emp-4', name: 'Sarah Jenkins', email: 'sarah@assetflow.com', department_id: null, role: ROLE.ASSET_MANAGER, status: 'Active' },
  { id: 'emp-5', name: 'Laksh Admin', email: 'admin@assetflow.com', department_id: null, role: ROLE.ADMIN, status: 'Active' },
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
  { id: 'asset-1', name: 'MacBook Pro 16"', category_id: 'cat-1', asset_tag: 'AF-0114', serial_number: 'C02DFGH1Q05D', acquisition_date: '2025-01-15', acquisition_cost: 2499, condition: 'New', location: 'HQ - Floor 3', photo_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=300&q=80', documents: [], is_shared: false, status: ASSET_STATE.ALLOCATED },
  { id: 'asset-2', name: 'Dell XPS 15', category_id: 'cat-1', asset_tag: 'AF-0115', serial_number: 'DELL7728XPS', acquisition_date: '2025-02-10', acquisition_cost: 1899, condition: 'Good', location: 'HQ - Floor 3', photo_url: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=300&q=80', documents: [], is_shared: false, status: ASSET_STATE.AVAILABLE },
  { id: 'asset-3', name: 'Conference Room Alpha', category_id: 'cat-2', asset_tag: 'AF-2001', serial_number: 'ROOM-CONF-A', acquisition_date: '2024-05-01', acquisition_cost: 8000, condition: 'Good', location: 'HQ - Floor 1', photo_url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=300&q=80', documents: [], is_shared: true, status: ASSET_STATE.AVAILABLE },
  { id: 'asset-4', name: 'Company SUV (Tesla Y)', category_id: 'cat-3', asset_tag: 'AF-3001', serial_number: 'TESLA-MODELY-1', acquisition_date: '2024-10-12', acquisition_cost: 45000, condition: 'New', location: 'Parking B', photo_url: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=300&q=80', documents: [], is_shared: true, status: ASSET_STATE.AVAILABLE },
  { id: 'asset-5', name: 'Ergonomic Desk Chair', category_id: 'cat-2', asset_tag: 'AF-0012', serial_number: 'CHAIR-STEELCASE-1', acquisition_date: '2024-03-20', acquisition_cost: 850, condition: 'Fair', location: 'HQ - Floor 2', photo_url: 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&w=300&q=80', documents: [], is_shared: false, status: ASSET_STATE.ALLOCATED },
];

const initialMockAllocations: Allocation[] = [
  { id: 'alloc-1', asset_id: 'asset-1', allocated_to_type: 'Employee', employee_id: 'emp-1', department_id: null, allocated_by: 'emp-4', allocated_at: '2025-01-16T10:00:00Z', expected_return_date: '2026-06-30', returned_at: null, check_in_notes: null, status: ALLOCATION_STATE.ACTIVE },
  { id: 'alloc-2', asset_id: 'asset-5', allocated_to_type: 'Employee', employee_id: 'emp-2', department_id: null, allocated_by: 'emp-4', allocated_at: '2024-03-22T09:00:00Z', expected_return_date: '2025-03-22', returned_at: null, check_in_notes: null, status: ALLOCATION_STATE.OVERDUE },
];

// Entity Mappings (Backend <-> Frontend)
const mapBackendStateToFrontend = (state: string): AssetStatus => {
  switch (state) {
    case 'available': return 'Available';
    case 'allocated': return 'Allocated';
    case 'reserved': return 'Reserved';
    case 'under_maintenance': return 'Under Maintenance';
    case 'lost': return 'Lost';
    case 'retired': return 'Retired';
    case 'disposed': return 'Disposed';
    default: return 'Available';
  }
};

const mapBackendAssetToFrontend = (a: any, index: number): Asset => {
  return {
    id: a.id,
    name: a.name,
    category_id: a.categoryId,
    asset_tag: `AF-${String(index + 1).padStart(4, '0')}`,
    serial_number: a.serialNumber,
    acquisition_date: new Date(a.createdAt || Date.now()).toISOString().split('T')[0],
    acquisition_cost: 1500,
    condition: 'Good',
    location: 'HQ - Floor 3',
    photo_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=300&q=80',
    documents: [],
    is_shared: false,
    status: mapBackendStateToFrontend(a.state),
    custom_fields: {},
  };
};

const mapBackendAllocationToFrontend = (a: any): Allocation => {
  return {
    id: a.id,
    asset_id: a.assetId,
    allocated_to_type: a.allocatedToEmployeeId ? 'Employee' : 'Department',
    employee_id: a.allocatedToEmployeeId || null,
    department_id: a.allocatedToDepartmentId || null,
    allocated_by: a.allocatedBy,
    allocated_at: a.allocatedAt,
    expected_return_date: null,
    returned_at: a.returnedAt || null,
    check_in_notes: null,
    status: a.status === 'active' ? 'Active' : 'Returned',
  };
};

const mapBackendBookingToFrontend = (b: any): Booking => {
  return {
    id: b.id,
    asset_id: b.assetId,
    booked_by: b.bookedByEmployeeId,
    start_time: b.startTime,
    end_time: b.endTime,
    status: b.status === 'confirmed' ? 'Upcoming' : b.status === 'cancelled' ? 'Cancelled' : 'Completed',
  };
};

const mapBackendMaintenanceStateToFrontend = (state: string): MaintenanceStatus => {
  switch (state) {
    case 'requested': return 'Pending';
    case 'approved': return 'Approved';
    case 'in_progress': return 'In Progress';
    case 'completed': return 'Resolved';
    case 'rejected': return 'Rejected';
    default: return 'Pending';
  }
};

const mapBackendMaintenanceToFrontend = (m: any): MaintenanceRequest => {
  return {
    id: m.id,
    asset_id: m.assetId,
    requested_by: m.requestedBy,
    description: m.notes || 'No description provided.',
    priority: 'Medium',
    photo_url: null,
    status: mapBackendMaintenanceStateToFrontend(m.state),
    assigned_technician: null,
    approved_by: m.approvedBy || null,
    resolution_notes: null,
    resolved_at: m.state === 'completed' ? m.updatedAt : null,
    created_at: m.createdAt,
  };
};

const mapBackendAuditToFrontend = (a: any): AuditCycle => {
  return {
    id: a.id,
    name: a.name,
    scope_type: 'All',
    scope_department_id: null,
    scope_location: null,
    start_date: a.startDate,
    end_date: a.endDate,
    status: a.status === 'planned' ? 'Draft' : a.status === 'active' ? 'Active' : 'Completed',
  };
};

const mapBackendFindingToFrontend = (f: any): AuditResult => {
  return {
    id: f.id,
    audit_cycle_id: f.auditCycleId,
    asset_id: f.assetId,
    auditor_id: f.createdBy,
    verification_status: f.discrepancyFlag ? 'Damaged' : 'Verified',
    notes: f.notes || null,
    verified_at: new Date().toISOString(),
  };
};

const mapBackendToFrontendRole = (role: string): Role => {
  switch (role) {
    case 'super_admin':
    case 'admin':
      return 'Admin';
    case 'manager':
      return 'Asset Manager';
    case 'auditor':
      return 'Department Head';
    case 'employee':
    default:
      return 'Employee';
  }
};

const mapFrontendToBackendRole = (role: string): string => {
  switch (role) {
    case 'Admin':
      return 'admin';
    case 'Asset Manager':
      return 'manager';
    case 'Department Head':
      return 'auditor';
    case 'Employee':
    default:
      return 'employee';
  }
};

interface AppContextType {
  isLinked: boolean;
  session: any;
  authLoading: boolean;
  currentRole: Role;
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
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  accentColor: string;
  accentHoverColor: string;
  bgColor: string;
  preset: 'default' | 'sakura' | 'odoo';
  setPreset: (preset: 'default' | 'sakura' | 'odoo') => void;
  setThemeColors: (accent: string, hover: string, bg: string) => void;
  switchRole: (role: Role) => void;
  registerAsset: (data: Partial<Asset>) => Promise<void>;
  allocateAsset: (data: Partial<Allocation>) => Promise<{ success: boolean; error?: string; holderName?: string }>;
  requestTransfer: (data: Partial<Transfer>) => Promise<void>;
  approveTransfer: (id: string) => Promise<void>;
  rejectTransfer: (id: string, reason: string) => Promise<void>;
  returnAsset: (id: string, notes: string, condition: Asset['condition']) => Promise<void>;
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
  promoteEmployee: (empId: string, role: Role) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const applyPresetTheme = (
  selectedPreset: 'default' | 'sakura' | 'odoo',
  theme: 'dark' | 'light',
  setAccent: (value: string) => void,
  setHover: (value: string) => void,
  setBg: (value: string) => void
) => {
  if (selectedPreset === 'sakura') {
    setAccent('#ff7e93');
    setHover('#be123c');
    setBg(theme === 'dark' ? '#120204' : '#fff0f2');
    return;
  }
  if (selectedPreset === 'odoo') {
    setAccent('#714b67');
    setHover('#5e3855');
    setBg(theme === 'dark' ? '#12030f' : '#f6ebf4');
  }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isLinked = isSupabaseConfigured();
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('assetflow-theme') as 'dark' | 'light') || 'dark');
  const [preset, setPresetState] = useState<'default' | 'sakura' | 'odoo'>(() => (localStorage.getItem('assetflow-preset') as 'default' | 'sakura' | 'odoo') || 'default');
  const [accentColor, setAccentColorState] = useState(() => localStorage.getItem('assetflow-accent') || '#6366f1');
  const [accentHoverColor, setAccentHoverColorState] = useState(() => localStorage.getItem('assetflow-accent-hover') || '#4f46e5');
  const [bgColor, setBgColorState] = useState(() => localStorage.getItem('assetflow-bg') || '#000000');

  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(isLinked);

  const [currentRole, setCurrentRole] = useState<Role>(ROLE.ADMIN);
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
  const [currentEmployee, setCurrentEmployee] = useState<Employee>(initialMockEmployees[4]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('assetflow-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accentColor);
    document.documentElement.style.setProperty('--accent-hover', accentHoverColor);
    document.documentElement.style.setProperty('--bg-app', bgColor);
  }, [accentColor, accentHoverColor, bgColor]);

  // Auth Session State syncing
  useEffect(() => {
    if (!isLinked) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [isLinked]);

  const fetchData = async () => {
    if (!isLinked) {
      setLogs([{
        id: 'log-1',
        actor_id: 'emp-5',
        action: 'System Init',
        entity_type: 'system',
        entity_id: '0000',
        details: { message: 'AssetFlow initialized in Sandbox Demo mode.' },
        created_at: new Date().toISOString(),
      }]);
      return;
    }

    if (!session) return;

    try {
      const [depts, cats, asts, allocs, bks, maint, cyc, rolesData, historyData] = await Promise.all([
        api.get('/api/departments'),
        api.get('/api/asset-categories'),
        api.get('/api/assets'),
        api.get('/api/allocations'),
        api.get('/api/bookings'),
        api.get('/api/maintenance'),
        api.get('/api/audit/cycles'),
        supabase.from('user_roles').select('*'), // direct db query for roles
        supabase.from('asset_history').select('*'), // direct db query for history logs
      ]);

      const rolesMap = new Map<string, string>();
      if (rolesData.data) {
        rolesData.data.forEach((r: any) => {
          rolesMap.set(r.user_id, r.role);
        });
      }

      if (historyData.data) {
        setHistory(historyData.data as AssetHistory[]);
      }

      // Map departments
      const mappedDepts: Department[] = depts.map((d: any) => ({
        id: d.id,
        name: d.name,
        head_id: null,
        parent_department_id: null,
        status: 'Active',
      }));
      setDepartments(mappedDepts);

      // Map categories
      const mappedCats: AssetCategory[] = cats.map((c: any) => ({
        id: c.id,
        name: c.name,
        custom_fields: {},
      }));
      setCategories(mappedCats);

      // Fetch employees list & map them
      const employeesList = await api.get('/api/employees');
      const mappedEmployees: Employee[] = employeesList.map((e: any) => {
        const dbRole = rolesMap.get(e.userId) || 'employee';
        return {
          id: e.id,
          userId: e.userId,
          name: e.fullName,
          email: `${e.fullName.toLowerCase().replace(/\s+/g, '')}@assetflow.com`,
          department_id: e.departmentId,
          role: mapBackendToFrontendRole(dbRole),
          status: 'Active',
        };
      });
      setEmployees(mappedEmployees);

      // Map assets
      const mappedAssets: Asset[] = asts.map((a: any, index: number) => 
        mapBackendAssetToFrontend(a, index)
      );
      setAssets(mappedAssets);

      // Map allocations
      const mappedAllocations: Allocation[] = allocs.map((a: any) => 
        mapBackendAllocationToFrontend(a)
      );
      setAllocations(mappedAllocations);

      // Map bookings
      const mappedBookings: Booking[] = bks.map((b: any) => 
        mapBackendBookingToFrontend(b)
      );
      setBookings(mappedBookings);

      // Map maintenance requests
      const mappedMaint: MaintenanceRequest[] = maint.map((m: any) => 
        mapBackendMaintenanceToFrontend(m)
      );
      setMaintenanceRequests(mappedMaint);

      // Map audit cycles
      const mappedCycles: AuditCycle[] = cyc.map((c: any) => 
        mapBackendAuditToFrontend(c)
      );
      setAuditCycles(mappedCycles);

      // Fetch and map findings for active cycles
      const activeCycles = mappedCycles.filter(c => c.status === 'Active');
      const findingsPromises = activeCycles.map(c => api.get(`/api/audit/cycles/${c.id}/findings`).catch(() => []));
      const allFindings = await Promise.all(findingsPromises);
      const mappedFindings: AuditResult[] = allFindings.flat().map((f: any) => 
        mapBackendFindingToFrontend(f)
      );
      setAuditResults(mappedFindings);

      // Map current active employee & currentRole
      const currentUserId = session.user.id;
      const matchedEmp = mappedEmployees.find((e: any) => e.userId === currentUserId);
      if (matchedEmp) {
        setCurrentEmployee(matchedEmp);
        setCurrentRole(matchedEmp.role);
      } else {
        const currentSessionRole = session.user.app_metadata?.role || 'employee';
        const defaultEmp: Employee = {
          id: 'temp-emp',
          userId: currentUserId,
          name: session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          department_id: null,
          role: mapBackendToFrontendRole(currentSessionRole),
          status: 'Active',
        };
        setCurrentEmployee(defaultEmp);
        setCurrentRole(defaultEmp.role);
      }

      setLogs([
        {
          id: 'log-live-1',
          actor_id: currentUserId,
          action: 'System Sync',
          entity_type: 'system',
          entity_id: '0000',
          details: { message: 'Database fully synchronized with Express API.' },
          created_at: new Date().toISOString(),
        }
      ]);
    } catch (error) {
      console.error('Error loading data from Express API:', error);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [isLinked, session]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (preset !== 'default') {
      applyPresetTheme(preset, nextTheme, setAccentColorState, setAccentHoverColorState, setBgColorState);
    }
  };

  const setPreset = (selectedPreset: 'default' | 'sakura' | 'odoo') => {
    setPresetState(selectedPreset);
    localStorage.setItem('assetflow-preset', selectedPreset);
    applyPresetTheme(selectedPreset, theme, setAccentColorState, setAccentHoverColorState, setBgColorState);
  };

  const setThemeColors = (accent: string, hover: string, bg: string) => {
    setPresetState('default');
    setAccentColorState(accent);
    setAccentHoverColorState(hover);
    setBgColorState(bg);
    localStorage.setItem('assetflow-preset', 'default');
    localStorage.setItem('assetflow-accent', accent);
    localStorage.setItem('assetflow-accent-hover', hover);
    localStorage.setItem('assetflow-bg', bg);
  };

  const switchRole = (role: Role) => {
    setCurrentRole(role);
    const matched = employees.find((employee) => employee.role === role) ?? initialMockEmployees[4];
    setCurrentEmployee(matched);
  };

  const registerAsset = async (data: Partial<Asset>) => {
    if (isLinked) {
      await api.post('/api/assets', {
        name: data.name || '',
        categoryId: data.category_id || '',
        serialNumber: data.serial_number || `SN-${Math.floor(100000 + Math.random() * 900000)}`,
      });
      void fetchData();
      return;
    }

    const newAsset: Asset = {
      id: crypto.randomUUID(),
      name: data.name || '',
      category_id: data.category_id || '',
      asset_tag: `AF-${String(assets.length + 1).padStart(4, '0')}`,
      serial_number: data.serial_number || '',
      acquisition_date: data.acquisition_date || new Date().toISOString().split('T')[0],
      acquisition_cost: Number(data.acquisition_cost) || 0,
      condition: data.condition || 'New',
      location: data.location || '',
      photo_url: data.photo_url || 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?auto=format&fit=crop&w=300&q=80',
      documents: data.documents || [],
      is_shared: Boolean(data.is_shared),
      status: ASSET_STATE.AVAILABLE,
      custom_fields: data.custom_fields,
    };

    setAssets((prev) => [...prev, newAsset]);
  };

  const allocateAsset = async (data: Partial<Allocation>) => {
    if (isLinked) {
      try {
        const payload = {
          assetId: data.asset_id || '',
          allocatedToEmployeeId: data.allocated_to_type === 'Employee' ? data.employee_id : undefined,
          allocatedToDepartmentId: data.allocated_to_type === 'Department' ? data.department_id : undefined,
        };
        await api.post('/api/allocations', payload);
        void fetchData();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Allocation failed' };
      }
    }

    const targetAsset = assets.find((asset) => asset.id === data.asset_id);
    if (!targetAsset) return { success: false, error: 'Asset not found.' };

    if (targetAsset.status !== ASSET_STATE.AVAILABLE) {
      const currentAllocation = allocations.find(
        (allocation) => allocation.asset_id === data.asset_id && allocation.status === ALLOCATION_STATE.ACTIVE
      );
      const holderName =
        currentAllocation?.allocated_to_type === 'Department'
          ? departments.find((department) => department.id === currentAllocation.department_id)?.name || 'Department'
          : employees.find((employee) => employee.id === currentAllocation?.employee_id)?.name || 'Employee';

      return {
        success: false,
        error: `Conflict: Asset is currently ${targetAsset.status}.`,
        holderName,
      };
    }

    const newAllocation: Allocation = {
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
      status: ALLOCATION_STATE.ACTIVE,
    };

    setAllocations((prev) => [...prev, newAllocation]);
    setAssets((prev) =>
      prev.map((asset) =>
        asset.id === newAllocation.asset_id ? { ...asset, status: ASSET_STATE.ALLOCATED } : asset
      )
    );
    return { success: true };
  };

  const requestTransfer = async (data: Partial<Transfer>) => {
    const newTransfer: Transfer = {
      id: crypto.randomUUID(),
      asset_id: data.asset_id || '',
      from_employee_id: data.from_employee_id || '',
      to_employee_id: data.to_employee_id || '',
      requested_by: currentEmployee.id,
      status: TRANSFER_STATE.PENDING,
      approved_by: null,
      approved_at: null,
      rejection_reason: null,
      created_at: new Date().toISOString(),
    };

    setTransfers((prev) => [...prev, newTransfer]);
  };

  const approveTransfer = async (id: string) => {
    setTransfers((prev) =>
      prev.map((transfer) =>
        transfer.id === id
          ? { ...transfer, status: TRANSFER_STATE.APPROVED, approved_by: currentEmployee.id, approved_at: new Date().toISOString() }
          : transfer
      )
    );
  };

  const rejectTransfer = async (id: string, reason: string) => {
    setTransfers((prev) =>
      prev.map((transfer) =>
        transfer.id === id ? { ...transfer, status: TRANSFER_STATE.REJECTED, rejection_reason: reason } : transfer
      )
    );
  };

  const returnAsset = async (allocationId: string, notes: string, condition: Asset['condition']) => {
    if (isLinked) {
      await api.post(`/api/allocations/${allocationId}/return`);
      void fetchData();
      return;
    }

    const allocation = allocations.find((item) => item.id === allocationId);
    if (!allocation) return;

    setAllocations((prev) =>
      prev.map((item) =>
        item.id === allocationId
          ? { ...item, status: ALLOCATION_STATE.RETURNED, returned_at: new Date().toISOString(), check_in_notes: notes }
          : item
      )
    );
    setAssets((prev) =>
      prev.map((asset) =>
        asset.id === allocation.asset_id ? { ...asset, status: ASSET_STATE.AVAILABLE, condition } : asset
      )
    );
  };

  const createBooking = async (data: Partial<Booking>) => {
    if (isLinked) {
      try {
        await api.post('/api/bookings', {
          assetId: data.asset_id || '',
          startTime: data.start_time || '',
          endTime: data.end_time || '',
        });
        void fetchData();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Booking overlap or conflict occurred.' };
      }
    }

    const hasOverlap = bookings.some(
      (booking) =>
        booking.asset_id === data.asset_id &&
        booking.status !== BOOKING_STATE.CANCELLED &&
        new Date(booking.start_time) < new Date(data.end_time || '') &&
        new Date(booking.end_time) > new Date(data.start_time || '')
    );

    if (hasOverlap) {
      return { success: false, error: 'Time Slot Conflict: This asset is already booked during this time.' };
    }

    const newBooking: Booking = {
      id: crypto.randomUUID(),
      asset_id: data.asset_id || '',
      booked_by: currentEmployee.id,
      start_time: data.start_time || '',
      end_time: data.end_time || '',
      status: BOOKING_STATE.UPCOMING,
    };

    setBookings((prev) => [...prev, newBooking]);
    return { success: true };
  };

  const cancelBooking = async (id: string) => {
    if (isLinked) {
      await api.post(`/api/bookings/${id}/cancel`);
      void fetchData();
      return;
    }
    setBookings((prev) => prev.map((booking) => (booking.id === id ? { ...booking, status: BOOKING_STATE.CANCELLED } : booking)));
  };

  const raiseMaintenance = async (data: Partial<MaintenanceRequest>) => {
    if (isLinked) {
      await api.post('/api/maintenance', {
        assetId: data.asset_id || '',
        notes: data.description || '',
      });
      void fetchData();
      return;
    }

    const newRequest: MaintenanceRequest = {
      id: crypto.randomUUID(),
      asset_id: data.asset_id || '',
      requested_by: currentEmployee.id,
      description: data.description || '',
      priority: data.priority || 'Medium',
      photo_url: data.photo_url || null,
      status: MAINTENANCE_STATE.PENDING,
      assigned_technician: null,
      approved_by: null,
      resolution_notes: null,
      resolved_at: null,
      created_at: new Date().toISOString(),
    };

    setMaintenanceRequests((prev) => [...prev, newRequest]);
  };

  const approveMaintenance = async (id: string) => {
    if (isLinked) {
      await api.patch(`/api/maintenance/${id}/state`, { state: 'approved' });
      void fetchData();
      return;
    }
    setMaintenanceRequests((prev) =>
      prev.map((request) =>
        request.id === id ? { ...request, status: MAINTENANCE_STATE.APPROVED, approved_by: currentEmployee.id } : request
      )
    );
  };

  const rejectMaintenance = async (id: string) => {
    if (isLinked) {
      await api.patch(`/api/maintenance/${id}/state`, { state: 'rejected' });
      void fetchData();
      return;
    }
    setMaintenanceRequests((prev) =>
      prev.map((request) =>
        request.id === id ? { ...request, status: MAINTENANCE_STATE.REJECTED, approved_by: currentEmployee.id } : request
      )
    );
  };

  const assignTechnician = async (id: string, technician: string) => {
    if (isLinked) {
      await api.patch(`/api/maintenance/${id}/state`, { state: 'in_progress' });
      void fetchData();
      return;
    }
    setMaintenanceRequests((prev) =>
      prev.map((request) =>
        request.id === id ? { ...request, status: MAINTENANCE_STATE.TECHNICIAN_ASSIGNED, assigned_technician: technician } : request
      )
    );
  };

  const resolveMaintenance = async (id: string, notes: string) => {
    if (isLinked) {
      await api.patch(`/api/maintenance/${id}/state`, { state: 'completed' });
      void fetchData();
      return;
    }
    setMaintenanceRequests((prev) =>
      prev.map((request) =>
        request.id === id ? { ...request, status: MAINTENANCE_STATE.RESOLVED, resolution_notes: notes, resolved_at: new Date().toISOString() } : request
      )
    );
  };

  const createAuditCycle = async (data: Partial<AuditCycle>, auditors: string[]) => {
    if (isLinked) {
      const newCycle = await api.post('/api/audit/cycles', {
        name: data.name || '',
        startDate: data.start_date || '',
        endDate: data.end_date || '',
        status: 'active',
      });
      
      if (auditors && auditors.length > 0) {
        await Promise.all(
          auditors.map((auditorId) =>
            api.post(`/api/audit/cycles/${newCycle.id}/assignments`, { auditorEmployeeId: auditorId })
          )
        );
      }
      void fetchData();
      return;
    }

    const newCycle: AuditCycle = {
      id: crypto.randomUUID(),
      name: data.name || '',
      scope_type: data.scope_type || 'All',
      scope_department_id: data.scope_department_id || null,
      scope_location: data.scope_location || null,
      start_date: data.start_date || '',
      end_date: data.end_date || '',
      status: AUDIT_STATE.DRAFT,
    };

    setAuditCycles((prev) => [...prev, newCycle]);
  };

  const submitAuditResult = async (data: Partial<AuditResult>) => {
    if (isLinked) {
      await api.post('/api/audit/findings', {
        auditCycleId: data.audit_cycle_id || '',
        assetId: data.asset_id || '',
        expectedState: 'available',
        observedState: data.verification_status === 'Verified' ? 'available' : 'under_maintenance',
        notes: data.notes || '',
      });
      void fetchData();
      return;
    }

    const newResult: AuditResult = {
      id: crypto.randomUUID(),
      audit_cycle_id: data.audit_cycle_id || '',
      asset_id: data.asset_id || '',
      auditor_id: currentEmployee.id,
      verification_status: data.verification_status || AUDIT_RESULT_STATE.VERIFIED,
      notes: data.notes || null,
      verified_at: new Date().toISOString(),
    };

    setAuditResults((prev) => [...prev.filter((result) => !(result.audit_cycle_id === newResult.audit_cycle_id && result.asset_id === newResult.asset_id)), newResult]);
  };

  const closeAuditCycle = async (id: string) => {
    setAuditCycles((prev) => prev.map((cycle) => (cycle.id === id ? { ...cycle, status: AUDIT_STATE.COMPLETED } : cycle)));
  };

  const dismissNotification = async (id: string) => {
    setNotifications((prev) => prev.map((notification) => (notification.id === id ? { ...notification, is_read: true } : notification)));
  };

  const addCustomDepartment = async (data: Partial<Department>) => {
    if (isLinked) {
      await api.post('/api/departments', { name: data.name || '' });
      void fetchData();
      return;
    }

    const newDepartment: Department = {
      id: crypto.randomUUID(),
      name: data.name || '',
      head_id: data.head_id || null,
      parent_department_id: data.parent_department_id || null,
      status: 'Active',
    };
    setDepartments((prev) => [...prev, newDepartment]);
  };

  const addCustomCategory = async (data: Partial<AssetCategory>) => {
    if (isLinked) {
      await api.post('/api/asset-categories', { name: data.name || '' });
      void fetchData();
      return;
    }

    const newCategory: AssetCategory = {
      id: crypto.randomUUID(),
      name: data.name || '',
      custom_fields: data.custom_fields || {},
    };
    setCategories((prev) => [...prev, newCategory]);
  };

  const promoteEmployee = async (empId: string, role: Role) => {
    if (isLinked) {
      const emp = employees.find((e) => e.id === empId);
      if (emp && emp.userId) {
        await api.post('/api/auth/assign-role', {
          targetUserId: emp.userId,
          role: mapFrontendToBackendRole(role),
        });
        void fetchData();
      }
      return;
    }

    setEmployees((prev) => prev.map((employee) => (employee.id === empId ? { ...employee, role } : employee)));
  };

  return (
    <AppContext.Provider
      value={{
        isLinked,
        session,
        authLoading,
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
        theme,
        toggleTheme,
        accentColor,
        accentHoverColor,
        bgColor,
        preset,
        setPreset,
        setThemeColors,
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
        promoteEmployee,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return context;
};

