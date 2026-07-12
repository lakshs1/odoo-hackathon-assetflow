import React from 'react';
import { 
  LayoutDashboard, 
  FolderTree, 
  Users, 
  ArrowLeftRight, 
  CalendarRange, 
  Wrench, 
  ClipboardCheck, 
  BarChart3, 
  Settings 
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  openSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, openSettings }) => {
  const { currentRole } = useApp();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Asset Manager', 'Department Head', 'Employee'] },
    { id: 'assets', label: 'Asset Directory', icon: FolderTree, roles: ['Admin', 'Asset Manager', 'Department Head', 'Employee'] },
    { id: 'allocations', label: 'Allocations & Transfers', icon: ArrowLeftRight, roles: ['Admin', 'Asset Manager', 'Department Head', 'Employee'] },
    { id: 'bookings', label: 'Resource Bookings', icon: CalendarRange, roles: ['Admin', 'Asset Manager', 'Department Head', 'Employee'] },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench, roles: ['Admin', 'Asset Manager', 'Department Head', 'Employee'] },
    { id: 'audits', label: 'Asset Auditing', icon: ClipboardCheck, roles: ['Admin', 'Asset Manager', 'Department Head', 'Employee'] },
    { id: 'analytics', label: 'Reports & Analytics', icon: BarChart3, roles: ['Admin', 'Asset Manager', 'Department Head'] },
    { id: 'setup', label: 'Org Setup', icon: Users, roles: ['Admin'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(currentRole));

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#6366f1' }}>
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        <span>AssetFlow</span>
      </div>
      
      <ul className="sidebar-menu">
        {filteredItems.map(item => {
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <a 
                className={`sidebar-item ${activeView === item.id ? 'active' : ''}`}
                onClick={() => setActiveView(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </a>
            </li>
          );
        })}
      </ul>

      <div style={{ padding: '1rem 0.75rem', borderTop: '1px solid var(--border)' }}>
        <a className="sidebar-item" onClick={openSettings}>
          <Settings size={18} />
          <span>Supabase Link</span>
        </a>
      </div>
    </div>
  );
};
