import React from 'react';
import { 
  PlusCircle, 
  Calendar, 
  AlertOctagon, 
  Clock, 
  Wrench,
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface DashboardViewProps {
  setActiveView: (view: string) => void;
  onRegisterAssetClick: () => void;
  onBookResourceClick: () => void;
  onRaiseMaintenanceClick: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  setActiveView,
  onRegisterAssetClick,
  onBookResourceClick,
  onRaiseMaintenanceClick
}) => {
  const { 
    assets, 
    allocations, 
    maintenanceRequests, 
    bookings, 
    transfers, 
    logs,
    employees,
    departments
  } = useApp();

  // Metrics calculations
  const assetsAvailable = assets.filter(a => a.status === 'Available').length;
  const assetsAllocated = assets.filter(a => a.status === 'Allocated').length;
  const maintenanceToday = maintenanceRequests.filter(r => r.status !== 'Resolved').length;
  const activeBookings = bookings.filter(b => b.status === 'Ongoing' || b.status === 'Upcoming').length;
  const pendingTransfers = transfers.filter(t => t.status === 'Pending').length;
  
  // Calculate upcoming and overdue allocations
  const today = new Date();
  const upcomingReturnCount = allocations.filter(a => {
    if (a.status !== 'Active' || !a.expected_return_date) return false;
    const returnDate = new Date(a.expected_return_date);
    const diffTime = returnDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  }).length;

  const overdueAllocations = allocations.filter(a => {
    if (a.status !== 'Active' || !a.expected_return_date) return false;
    const returnDate = new Date(a.expected_return_date);
    return returnDate < today;
  });

  const getActorName = (id: string) => {
    return employees.find(e => e.id === id)?.name || 'System';
  };



  return (
    <div className="view-container">
      {/* 1. KPI Cards Row */}
      <div className="dashboard-grid">
        <div className="kpi-card" onClick={() => setActiveView('assets')} style={{ cursor: 'pointer' }}>
          <div className="kpi-title">Assets Available</div>
          <div className="kpi-value" style={{ color: 'var(--success)' }}>{assetsAvailable}</div>
          <div className="kpi-meta">Ready for deployment</div>
        </div>

        <div className="kpi-card" onClick={() => setActiveView('assets')} style={{ cursor: 'pointer' }}>
          <div className="kpi-title">Assets Allocated</div>
          <div className="kpi-value" style={{ color: 'var(--accent)' }}>{assetsAllocated}</div>
          <div className="kpi-meta">Deployed across teams</div>
        </div>

        <div className="kpi-card" onClick={() => setActiveView('maintenance')} style={{ cursor: 'pointer' }}>
          <div className="kpi-title">Active Repair Tickets</div>
          <div className="kpi-value" style={{ color: 'var(--warning)' }}>{maintenanceToday}</div>
          <div className="kpi-meta">Under maintenance</div>
        </div>

        <div className="kpi-card" onClick={() => setActiveView('bookings')} style={{ cursor: 'pointer' }}>
          <div className="kpi-title">Shared Bookings</div>
          <div className="kpi-value" style={{ color: 'var(--info)' }}>{activeBookings}</div>
          <div className="kpi-meta">Meeting spaces & vehicles</div>
        </div>

        <div className="kpi-card" onClick={() => setActiveView('allocations')} style={{ cursor: 'pointer' }}>
          <div className="kpi-title">Pending Transfers</div>
          <div className="kpi-value">{pendingTransfers}</div>
          <div className="kpi-meta">Awaiting approval</div>
        </div>

        <div className="kpi-card" style={{ borderColor: overdueAllocations.length > 0 ? 'var(--danger)' : 'var(--border)' }}>
          <div className="kpi-title" style={{ color: overdueAllocations.length > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>Overdue Returns</div>
          <div className="kpi-value" style={{ color: overdueAllocations.length > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>{overdueAllocations.length}</div>
          <div className="kpi-meta alert" style={{ color: overdueAllocations.length > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
            {upcomingReturnCount} due within 7 days
          </div>
        </div>
      </div>

      {/* 2. Quick Actions */}
      <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', letterSpacing: '-0.01em' }}>Quick Actions</h3>
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginBottom: '2.5rem' }}>
        <div 
          className="kpi-card" 
          onClick={onRegisterAssetClick}
          style={{ height: '110px', justifyContent: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(0,0,0,0) 100%)', border: '1px dashed var(--accent)', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <PlusCircle size={24} style={{ color: 'var(--accent)' }} />
            <div>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Register New Asset</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Add equipment or property</p>
            </div>
          </div>
        </div>

        <div 
          className="kpi-card" 
          onClick={onBookResourceClick}
          style={{ height: '110px', justifyContent: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.05) 0%, rgba(0,0,0,0) 100%)', border: '1px dashed var(--info)', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Calendar size={24} style={{ color: 'var(--info)' }} />
            <div>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Book Resource</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Reserve meeting room or vehicle</p>
            </div>
          </div>
        </div>

        <div 
          className="kpi-card" 
          onClick={onRaiseMaintenanceClick}
          style={{ height: '110px', justifyContent: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(0,0,0,0) 100%)', border: '1px dashed var(--warning)', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Wrench size={24} style={{ color: 'var(--warning)' }} />
            <div>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Raise Maintenance Request</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Report damage or schedule repair</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Splitted Details: Overdue Lists & Activity Stream */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
        
        {/* Overdue Allocations List */}
        <div className="table-container" style={{ marginBottom: 0 }}>
          <div className="table-header-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertOctagon size={18} style={{ color: 'var(--danger)' }} />
              <span className="table-title">Overdue Allocations</span>
            </div>
            <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '4px', fontWeight: 600 }}>
              Requires Check-In
            </span>
          </div>

          <div style={{ padding: '0.5rem', minHeight: '260px' }}>
            {overdueAllocations.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '260px', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={36} style={{ color: 'var(--success)', marginBottom: '0.5rem' }} />
                <span style={{ fontSize: '0.875rem' }}>All asset returns are up-to-date!</span>
              </div>
            ) : (
              <table className="custom-table" style={{ border: 'none' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '0.75rem 1rem' }}>Asset</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Holder</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Due Date</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueAllocations.map(alloc => {
                    const asset = assets.find(a => a.id === alloc.asset_id);
                    const holderName = alloc.allocated_to_type === 'Employee' 
                      ? getActorName(alloc.employee_id || '')
                      : departments.find(d => d.id === alloc.department_id)?.name || 'Department';
                    
                    return (
                      <tr key={alloc.id}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>
                          {asset?.name} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{asset?.asset_tag}</span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>{holderName}</td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--danger)', fontWeight: 600 }}>{alloc.expected_return_date}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                            onClick={() => setActiveView('allocations')}
                          >
                            Check In
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Activity Logs Stream */}
        <div className="table-container" style={{ marginBottom: 0 }}>
          <div className="table-header-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} style={{ color: 'var(--accent)' }} />
              <span className="table-title">System Activity Logs</span>
            </div>
            <a onClick={() => setActiveView('assets')} style={{ fontSize: '0.75rem', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>View All</a>
          </div>

          <div style={{ padding: '1.5rem', maxHeight: '315px', overflowY: 'auto' }}>
            <div className="timeline">
              {logs.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 0', fontSize: '0.875rem' }}>
                  No system logs recorded.
                </div>
              ) : (
                logs.slice().reverse().map(log => (
                  <div key={log.id} className="timeline-item" style={{ marginBottom: '1.25rem' }}>
                    <div className="timeline-dot" style={{ backgroundColor: 'var(--accent)' }} />
                    <div className="timeline-content" style={{ padding: '0.75rem 1rem' }}>
                      <div className="timeline-header" style={{ marginBottom: '0.25rem' }}>
                        <span className="timeline-title" style={{ fontSize: '0.8125rem' }}>{log.action}</span>
                        <span className="timeline-time" style={{ fontSize: '0.7rem' }}>
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        User <strong>{getActorName(log.actor_id)}</strong> performed {log.action.toLowerCase()} on {log.entity_type} {log.details?.tag || ''}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
