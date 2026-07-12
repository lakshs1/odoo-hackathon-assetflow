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
  Settings,
  LogOut
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../supabase';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  openSettings: () => void;
  openCustomize: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeView, 
  setActiveView, 
  openSettings,
  openCustomize
}) => {
  const { currentRole, isLinked } = useApp();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Asset Manager', 'Department Head', 'Employee'] },
    { id: 'assets', label: 'Asset Directory', icon: FolderTree, roles: ['Admin', 'Asset Manager', 'Department Head', 'Employee'] },
    { id: 'allocations', label: 'Allocations & Transfers', icon: ArrowLeftRight, roles: ['Admin', 'Asset Manager', 'Department Head'] },
    { id: 'bookings', label: 'Resource Booking', icon: CalendarRange, roles: ['Admin', 'Asset Manager', 'Department Head', 'Employee'] },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench, roles: ['Admin', 'Asset Manager', 'Department Head', 'Employee'] },
    { id: 'audits', label: 'Asset Auditing', icon: ClipboardCheck, roles: ['Admin', 'Asset Manager', 'Department Head', 'Employee'] },
    { id: 'analytics', label: 'Reports & Analytics', icon: BarChart3, roles: ['Admin', 'Asset Manager', 'Department Head'] },
    { id: 'setup', label: 'Org Setup', icon: Users, roles: ['Admin'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(currentRole));

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)' }}>
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

      <div style={{ padding: '1rem 0.75rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <a className="sidebar-item" onClick={openCustomize} style={{ marginBottom: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}>
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 11.2386 21.3814 10.62 20.62 10.62H17.48C16.6626 10.62 16 9.95738 16 9.14V5.72C16 4.95858 15.3814 4.34 14.62 4.34H12C6.47715 4.34 2 8.81715 2 14.34C2 18.5683 4.60623 21.1969 8.5 21.89C9.01 21.98 9.5 22 10 22L12 22" />
            <circle cx="7.5" cy="10.5" r="1.5" fill="currentColor" />
            <circle cx="11.5" cy="7.5" r="1.5" fill="currentColor" />
            <circle cx="16.5" cy="11.5" r="1.5" fill="currentColor" />
            <circle cx="6.5" cy="15.5" r="1.5" fill="currentColor" />
          </svg>
          <span>Customize Theme</span>
        </a>
        <a className="sidebar-item" onClick={openSettings} style={{ marginBottom: 0 }}>
          <Settings size={18} />
          <span>Supabase Link</span>
        </a>
        {isLinked && (
          <a className="sidebar-item" onClick={() => void supabase.auth.signOut()} style={{ marginBottom: 0, color: 'var(--danger)' }}>
            <LogOut size={18} />
            <span>Sign Out</span>
          </a>
        )}
      </div>
    </div>
  );
};
