import React, { useState } from 'react';
import { Bell, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface HeaderProps {
  onSearchClick: () => void;
  activeView: string;
}

export const Header: React.FC<HeaderProps> = ({ onSearchClick, activeView }) => {
  const { currentRole, currentEmployee, switchRole, notifications, dismissNotification } = useApp();
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const unreadNotifications = notifications.filter(n => !n.is_read);

  const formatViewName = (view: string) => {
    if (view === 'org') return 'Organization Setup';
    return view.charAt(0).toUpperCase() + view.slice(1).replace('-', ' ');
  };

  return (
    <div className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{formatViewName(activeView)}</h2>
      </div>

      <div className="header-actions">
        {/* Search Bar - triggers command palette */}
        <div className="header-search" onClick={onSearchClick}>
          <Search size={16} />
          <span>Quick search everywhere... (⌘K)</span>
        </div>

        {/* Role Selector dropdown for judges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Viewing as:</span>
          <select 
            className="role-badge-selector"
            value={currentRole}
            onChange={(e) => switchRole(e.target.value as any)}
          >
            <option value="Admin">Admin (Full Access)</option>
            <option value="Asset Manager">Asset Manager</option>
            <option value="Department Head">Department Head</option>
            <option value="Employee">Employee (Staff)</option>
          </select>
        </div>

        {/* Notifications Icon & Dropdown */}
        <div style={{ position: 'relative' }}>
          <div className="notification-bell" onClick={() => setShowNotifDropdown(!showNotifDropdown)}>
            <Bell size={20} />
            {unreadNotifications.length > 0 && <span className="notification-badge" />}
          </div>

          {showNotifDropdown && (
            <div 
              className="modal-content" 
              style={{ 
                position: 'absolute', 
                top: '40px', 
                right: '0', 
                width: '320px', 
                zIndex: 1000, 
                boxShadow: 'var(--shadow-lg)',
                backgroundColor: 'var(--bg-card)',
                borderRadius: '8px'
              }}
            >
              <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Notifications</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{unreadNotifications.length} Unread</span>
              </div>
              <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '0.5rem' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                    No notifications
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      style={{ 
                        padding: '0.75rem', 
                        borderRadius: '6px', 
                        marginBottom: '0.25rem',
                        backgroundColor: notif.is_read ? 'transparent' : 'rgba(99, 102, 241, 0.05)',
                        borderLeft: notif.is_read ? 'none' : '3px solid var(--accent)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                        cursor: 'pointer'
                      }}
                      onClick={() => dismissNotification(notif.id)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                        <span style={{ fontWeight: 600, color: notif.is_read ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{notif.title}</span>
                        {!notif.is_read && <span style={{ color: 'var(--accent)', fontWeight: 600 }}>New</span>}
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>{notif.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Employee Initials Circle */}
        <div 
          style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: '50%', 
            backgroundColor: 'var(--accent)', 
            color: '#fff', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontWeight: 700, 
            fontSize: '0.8125rem',
            cursor: 'pointer'
          }}
          title={`${currentEmployee.name} (${currentEmployee.email})`}
        >
          {currentEmployee.name.split(' ').map(n => n[0]).join('')}
        </div>
      </div>
    </div>
  );
};
