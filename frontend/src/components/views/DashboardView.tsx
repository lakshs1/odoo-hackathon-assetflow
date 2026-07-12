import React, { useState } from 'react';
import { 
  PlusCircle, 
  Calendar, 
  AlertOctagon, 
  Clock, 
  Wrench,
  CheckCircle2,
  Plus
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface DashboardViewProps {
  setActiveView: (view: string) => void;
  onRegisterAssetClick: () => void;
  onBookResourceClick: () => void;
  onRaiseMaintenanceClick: () => void;
}

interface ActiveWidget {
  instanceId: string;
  widgetId: string;
  size: 'small' | 'medium' | 'large';
  shape: 'glass' | 'cyber' | 'rounded' | 'sharp';
}

interface WidgetDef {
  id: string;
  title: string;
  category: 'Metrics' | 'Analytics' | 'Activity & Feeds';
  description: string;
  defaultSize: 'small' | 'medium' | 'large';
}

const WIDGET_LIBRARY: WidgetDef[] = [
  { id: 'available', title: 'Assets Available', category: 'Metrics', description: 'Available hardware assets in inventory ready for deployment.', defaultSize: 'small' },
  { id: 'allocated', title: 'Assets Allocated', category: 'Metrics', description: 'Count of equipment deployed across teams.', defaultSize: 'small' },
  { id: 'repairs', title: 'Active Repairs', category: 'Metrics', description: 'Damage reports and hardware tickets undergoing repairs.', defaultSize: 'small' },
  { id: 'bookings', title: 'Shared Bookings', category: 'Metrics', description: 'Reserved conference rooms, spaces, and vehicles.', defaultSize: 'small' },
  { id: 'transfers', title: 'Pending Transfers', category: 'Metrics', description: 'Hardware items awaiting peer-to-peer supervisor approval.', defaultSize: 'small' },
  { id: 'overdue', title: 'Overdue Returns', category: 'Metrics', description: 'Equipment checked out past expected check-in dates.', defaultSize: 'small' },
  { id: 'utilization-chart', title: '6-Month Checkout Curve', category: 'Analytics', description: 'SVG line curve visualization of global deployment rates.', defaultSize: 'large' },
  { id: 'department-chart', title: 'Deployment by Department', category: 'Analytics', description: 'Horizontal bar breakdown of asset distribution per department.', defaultSize: 'medium' },
  { id: 'booking-heatmap', title: 'Reservation Densities (Heatmap)', category: 'Analytics', description: 'Hourly slot density breakdown showing peak reservation slots.', defaultSize: 'large' },
  { id: 'activity-feed', title: 'System Activity Logs', category: 'Activity & Feeds', description: 'Chronological timeline of system transactions.', defaultSize: 'large' },
  { id: 'upcoming-bookings', title: 'Upcoming Booking Feeds', category: 'Activity & Feeds', description: 'Queue listing upcoming space and vehicle reservations.', defaultSize: 'medium' },
];

const DEFAULT_ACTIVE_WIDGETS: ActiveWidget[] = [
  { instanceId: '1', widgetId: 'available', size: 'small', shape: 'glass' },
  { instanceId: '2', widgetId: 'allocated', size: 'small', shape: 'glass' },
  { instanceId: '3', widgetId: 'repairs', size: 'small', shape: 'glass' },
  { instanceId: '4', widgetId: 'utilization-chart', size: 'large', shape: 'glass' },
  { instanceId: '5', widgetId: 'activity-feed', size: 'large', shape: 'glass' },
];

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

  const [showConfig, setShowConfig] = useState(false);
  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false);
  
  const [activeWidgets, setActiveWidgets] = useState<ActiveWidget[]>(() => {
    const saved = localStorage.getItem('assetflow-dashboard-widgets');
    return saved ? JSON.parse(saved) : DEFAULT_ACTIVE_WIDGETS;
  });

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

  // SVG Chart path calculations
  const totalAssets = assets.length;
  const allocatedAssets = assets.filter(a => a.status === 'Allocated').length;
  const utilizationRate = totalAssets > 0 ? Math.round((allocatedAssets / totalAssets) * 100) : 0;

  const utilizationTrend = [
    { month: 'Jan', rate: 45 },
    { month: 'Feb', rate: 58 },
    { month: 'Mar', rate: 64 },
    { month: 'Apr', rate: 70 },
    { month: 'May', rate: 82 },
    { month: 'Jun', rate: utilizationRate || 75 }
  ];

  const chartWidth = 500;
  const chartHeight = 160;
  const padding = 20;

  const points = utilizationTrend.map((t, idx) => {
    const x = padding + (idx * (chartWidth - padding * 2)) / (utilizationTrend.length - 1);
    const y = chartHeight - padding - (t.rate / 100) * (chartHeight - padding * 2);
    return { x, y, month: t.month, rate: t.rate };
  });

  const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`;

  // Department Bar Calculations
  const departmentChartData = departments.map(d => {
    const count = allocations.filter(a => a.department_id === d.id && a.status === 'Active').length;
    return { name: d.name, count };
  });
  const maxCount = Math.max(...departmentChartData.map(d => d.count), 1);

  // Heatmap hourly data
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const hours = ['09:00', '11:00', '13:00', '15:00', '17:00'];
  const getHeatmapColorClass = (dayIdx: number, hourIdx: number) => {
    const sum = (dayIdx + hourIdx) % 5;
    return `level-${sum}`;
  };

  // Layout Modification Actions
  const addWidget = (widgetId: string) => {
    const def = WIDGET_LIBRARY.find(w => w.id === widgetId);
    if (!def) return;
    const newWidget: ActiveWidget = {
      instanceId: Date.now().toString(),
      widgetId,
      size: def.defaultSize,
      shape: 'glass'
    };
    const updated = [...activeWidgets, newWidget];
    setActiveWidgets(updated);
    localStorage.setItem('assetflow-dashboard-widgets', JSON.stringify(updated));
    setShowWidgetLibrary(false);
  };

  const removeWidget = (instanceId: string) => {
    const updated = activeWidgets.filter(w => w.instanceId !== instanceId);
    setActiveWidgets(updated);
    localStorage.setItem('assetflow-dashboard-widgets', JSON.stringify(updated));
  };

  const updateWidgetSize = (instanceId: string, size: 'small' | 'medium' | 'large') => {
    const updated = activeWidgets.map(w => w.instanceId === instanceId ? { ...w, size } : w);
    setActiveWidgets(updated);
    localStorage.setItem('assetflow-dashboard-widgets', JSON.stringify(updated));
  };

  const updateWidgetShape = (instanceId: string, shape: 'glass' | 'cyber' | 'rounded' | 'sharp') => {
    const updated = activeWidgets.map(w => w.instanceId === instanceId ? { ...w, shape } : w);
    setActiveWidgets(updated);
    localStorage.setItem('assetflow-dashboard-widgets', JSON.stringify(updated));
  };

  const renderWidgetContent = (card: ActiveWidget) => {
    let onClickAction = () => {};
    let colorStyle = 'var(--text-primary)';
    let value = 0;
    let metaText = '';
    let doodleSvg = null;
    let customInner = null;

    if (card.widgetId === 'available') {
      onClickAction = () => setActiveView('assets');
      colorStyle = 'var(--success)';
      value = assetsAvailable;
      metaText = 'Ready for deployment';
      doodleSvg = (
        <svg className="kpi-doodle" viewBox="0 0 100 100" fill="none" stroke="currentColor">
          <circle cx="50" cy="50" r="30" strokeWidth="2" strokeDasharray="4 4" />
          <path d="M50 10 v10 M50 80 v10 M10 50 h10 M80 50 h10 M30 30 l8 8 M62 62 l8 8 M30 70 l8-8 M62 38 l8-8" strokeWidth="2" />
          <path d="M50 38 L54 46 L62 50 L54 54 L50 62 L46 54 L38 50 L46 46 Z" fill="currentColor" fillOpacity="0.15" />
        </svg>
      );
    } else if (card.widgetId === 'allocated') {
      onClickAction = () => setActiveView('assets');
      colorStyle = 'var(--accent)';
      value = assetsAllocated;
      metaText = 'Deployed across teams';
      doodleSvg = (
        <svg className="kpi-doodle" viewBox="0 0 100 100" fill="none" stroke="currentColor">
          <path d="M20 80 C 40 80, 40 50, 60 50 M20 80 C 40 80, 40 20, 60 20 M20 80 C 40 80, 40 80, 60 80" strokeWidth="2" strokeLinecap="round" />
          <circle cx="65" cy="20" r="8" strokeWidth="2" fill="currentColor" fillOpacity="0.1" />
          <circle cx="65" cy="50" r="8" strokeWidth="2" fill="currentColor" fillOpacity="0.1" />
          <circle cx="65" cy="80" r="8" strokeWidth="2" fill="currentColor" fillOpacity="0.1" />
          <path d="M15 80 A 5 5 0 1 1 25 80 A 5 5 0 1 1 15 80" strokeWidth="2" />
        </svg>
      );
    } else if (card.widgetId === 'repairs') {
      onClickAction = () => setActiveView('maintenance');
      colorStyle = 'var(--warning)';
      value = maintenanceToday;
      metaText = 'Under maintenance';
      doodleSvg = (
        <svg className="kpi-doodle" viewBox="0 0 100 100" fill="none" stroke="currentColor">
          <circle cx="50" cy="50" r="20" strokeWidth="2" strokeDasharray="5 3" />
          <path d="M25 25 L75 75 M75 25 L25 75" strokeWidth="3" strokeLinecap="round" />
          <path d="M35 50 h30 M50 35 v30" strokeWidth="1.5" />
          <path d="M10 20 L20 10 M80 90 L90 80" strokeWidth="2" />
        </svg>
      );
    } else if (card.widgetId === 'bookings') {
      onClickAction = () => setActiveView('bookings');
      colorStyle = 'var(--info)';
      value = activeBookings;
      metaText = 'Meeting spaces & vehicles';
      doodleSvg = (
        <svg className="kpi-doodle" viewBox="0 0 100 100" fill="none" stroke="currentColor">
          <rect x="25" y="25" width="50" height="50" rx="8" strokeWidth="2" />
          <line x1="25" y1="40" x2="75" y2="40" strokeWidth="2" />
          <circle cx="60" cy="58" r="10" stroke="var(--accent)" strokeWidth="2.5" fill="none" />
          <path d="M35 18 v10 M65 18 v10" strokeWidth="3" strokeLinecap="round" />
          <circle cx="38" cy="48" r="2" fill="currentColor" />
          <circle cx="50" cy="48" r="2" fill="currentColor" />
          <circle cx="62" cy="48" r="2" fill="currentColor" />
          <circle cx="38" cy="58" r="2" fill="currentColor" />
          <circle cx="50" cy="58" r="2" fill="currentColor" />
          <circle cx="38" cy="68" r="2" fill="currentColor" />
          <circle cx="50" cy="68" r="2" fill="currentColor" />
          <circle cx="62" cy="68" r="2" fill="currentColor" />
        </svg>
      );
    } else if (card.widgetId === 'transfers') {
      onClickAction = () => setActiveView('allocations');
      colorStyle = 'var(--text-primary)';
      value = pendingTransfers;
      metaText = 'Awaiting approval';
      doodleSvg = (
        <svg className="kpi-doodle" viewBox="0 0 100 100" fill="none" stroke="currentColor">
          <path d="M30 40 A 20 20 0 1 1 70 60" strokeWidth="2" strokeLinecap="round" />
          <path d="M70 60 A 20 20 0 1 1 30 40" strokeWidth="2" strokeDasharray="3 3" />
          <path d="M65 48 L75 60 L60 62" strokeWidth="2" strokeLinejoin="round" />
          <path d="M35 52 L25 40 L40 38" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="50" cy="50" r="8" strokeWidth="2" />
        </svg>
      );
    } else if (card.widgetId === 'overdue') {
      onClickAction = () => {};
      const hasOverdue = overdueAllocations.length > 0;
      colorStyle = hasOverdue ? 'var(--danger)' : 'var(--text-primary)';
      value = overdueAllocations.length;
      metaText = `${upcomingReturnCount} due within 7 days`;
      doodleSvg = (
        <svg className="kpi-doodle" viewBox="0 0 100 100" fill="none" stroke="currentColor">
          <path d="M50 20 A 25 25 0 0 1 75 45 V 65 H 25 V 45 A 25 25 0 0 1 50 20 Z" strokeWidth="2" strokeLinejoin="round" />
          <path d="M20 65 h60 M40 65 a10 10 0 0 0 20 0" strokeWidth="2" />
          <path d="M50 10 v10" strokeWidth="2" />
          <path d="M12 40 C 15 35, 20 30, 25 28 M88 40 C 85 35, 80 30, 75 28" strokeWidth="2" strokeLinecap="round" />
          <circle cx="50" cy="45" r="4" fill="currentColor" />
        </svg>
      );
    } else if (card.widgetId === 'utilization-chart') {
      customInner = (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>Checkout Trend Curve (Utilization: {utilizationRate}%)</span>
          <div style={{ position: 'relative', width: '100%', height: '120px' }}>
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <defs>
                <linearGradient id={`grad-${card.instanceId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Grid lines */}
              {[0, 50, 100].map((val, idx) => {
                const y = chartHeight - padding - (val / 100) * (chartHeight - padding * 2);
                return (
                  <g key={idx}>
                    <line x1={padding} y1={y} x2={chartWidth - padding} y2={y} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
                    <text x={padding - 5} y={y + 3} fill="var(--text-muted)" fontSize="9" textAnchor="end">{val}%</text>
                  </g>
                );
              })}
              <path d={areaPath} fill={`url(#grad-${card.instanceId})`} />
              <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
              {points.map((p, idx) => (
                <circle key={idx} cx={p.x} cy={p.y} r="4" fill="var(--bg-card)" stroke="var(--accent)" strokeWidth="2.5" />
              ))}
            </svg>
          </div>
        </div>
      );
    } else if (card.widgetId === 'department-chart') {
      customInner = (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 600 }}>Checkout Count per Department</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
            {departmentChartData.map((d, idx) => {
              const pct = (d.count / maxCount) * 100;
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.50rem' }}>
                  <span style={{ width: '80px', fontSize: '0.75rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {d.name}
                  </span>
                  <div style={{ flex: 1, height: '8px', backgroundColor: 'var(--bg-app)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div style={{ width: `${pct}%`, height: '100%', backgroundColor: 'var(--accent)', borderRadius: '3px' }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, width: '20px', textAlign: 'right' }}>
                    {d.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    } else if (card.widgetId === 'booking-heatmap') {
      customInner = (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 600 }}>Booking Peak Slots (Hourly Grid)</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {weekdays.map((day, dIdx) => (
              <div key={day} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.6875rem', width: '35px', color: 'var(--text-muted)' }}>{day}</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.375rem', flex: 1 }}>
                  {hours.map((hr, hIdx) => (
                    <div
                      key={hr}
                      className={`heatmap-cell ${getHeatmapColorClass(dIdx, hIdx)}`}
                      style={{ height: '16px', fontSize: '0.6rem', border: '1px solid var(--border)', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {hr}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    } else if (card.widgetId === 'activity-feed') {
      const recentLogs = logs.slice(0, 4);
      customInner = (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>System Transactions log</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recentLogs.length === 0 ? (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No transactions logs found.</span>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem' }}>
                  <span>{getActorName(log.actor_id)} - <span style={{ color: 'var(--accent)' }}>{log.action}</span></span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      );
    } else if (card.widgetId === 'upcoming-bookings') {
      const activeBookingsList = bookings.filter(b => b.status === 'Upcoming' || b.status === 'Ongoing').slice(0, 3);
      customInner = (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>Upcoming Space Allocations</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {activeBookingsList.length === 0 ? (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No bookings queued.</span>
            ) : (
              activeBookingsList.map((b) => {
                const assetName = assets.find(a => a.id === b.asset_id)?.name || 'Resource';
                const employeeName = getActorName(b.booked_by);
                return (
                  <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem' }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{assetName}</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>({employeeName})</span>
                    </div>
                    <span style={{ color: 'var(--accent)', fontSize: '0.7rem' }}>{b.start_time.split(' ')[1]}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      );
    }

    const spanClass = card.size === 'large' ? 'span-3' : card.size === 'medium' ? 'span-2' : 'span-1';
    const shapeClass = `shape-${card.shape}`;
    const minHeight = card.widgetId.includes('chart') || card.widgetId.includes('feed') || card.widgetId === 'booking-heatmap' || card.widgetId === 'upcoming-bookings' ? '250px' : '135px';

    return (
      <div 
        key={card.instanceId} 
        className={`kpi-card ${spanClass} ${shapeClass}`} 
        onClick={onClickAction}
        style={{ minHeight, height: 'auto', position: 'relative', padding: '1.25rem 1.25rem' }}
      >
        {/* Remove Button (shown in customize mode) */}
        {showConfig && (
          <button 
            onClick={(e) => { e.stopPropagation(); removeWidget(card.instanceId); }}
            style={{
              position: 'absolute',
              top: '0.5rem',
              right: '0.5rem',
              background: 'rgba(239, 68, 68, 0.15)',
              color: 'var(--danger)',
              border: 'none',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '0.75rem',
              zIndex: 5
            }}
            title="Remove Widget"
          >
            ✕
          </button>
        )}

        {/* Custom Inner Graphic/Layout or Standard KPI layout */}
        {customInner ? customInner : (
          <>
            <div className="kpi-title" style={{ color: card.widgetId === 'overdue' && overdueAllocations.length > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
              {WIDGET_LIBRARY.find(w => w.id === card.widgetId)?.title || 'Status Metric'}
            </div>
            <div className="kpi-value" style={{ color: colorStyle, fontSize: '2rem', fontWeight: 800 }}>{value}</div>
            <div className="kpi-meta" style={{ color: card.widgetId === 'overdue' && overdueAllocations.length > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{metaText}</div>
            {doodleSvg}
          </>
        )}

        {/* Card customization settings panel (shown in config mode) */}
        {showConfig && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginTop: 'auto',
            paddingTop: '0.5rem',
            borderTop: '1px dashed var(--border)',
            width: '100%',
            zIndex: 4
          }} onClick={(e) => e.stopPropagation()}>
            <select
              value={card.size}
              onChange={(e) => updateWidgetSize(card.instanceId, e.target.value as any)}
              style={{ fontSize: '0.65rem', padding: '0.15rem', borderRadius: '4px', background: 'var(--bg-app)', border: '1px solid var(--border)', color: 'var(--text-primary)', flex: 1 }}
            >
              <option value="small">Small (1x)</option>
              <option value="medium">Medium (2x)</option>
              <option value="large">Large (3x)</option>
            </select>
            <select
              value={card.shape}
              onChange={(e) => updateWidgetShape(card.instanceId, e.target.value as any)}
              style={{ fontSize: '0.65rem', padding: '0.15rem', borderRadius: '4px', background: 'var(--bg-app)', border: '1px solid var(--border)', color: 'var(--text-primary)', flex: 1 }}
            >
              <option value="glass">Glass</option>
              <option value="cyber">Cyber</option>
              <option value="rounded">Pillow</option>
              <option value="sharp">Sharp</option>
            </select>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="view-container">
      {/* 1. Header controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Executive Status Dashboard</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {showConfig && (
            <button 
              onClick={() => setShowWidgetLibrary(true)}
              className="btn btn-primary"
              style={{ padding: '0.4rem 0.8rem', gap: '0.375rem', fontSize: '0.8125rem' }}
            >
              <Plus size={14} />
              <span>Add Widget</span>
            </button>
          )}
          <button 
            onClick={() => setShowConfig(prev => !prev)}
            className="btn btn-secondary"
            style={{ padding: '0.4rem 0.8rem', gap: '0.375rem', fontSize: '0.8125rem' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
            </svg>
            <span>{showConfig ? 'Lock Layout' : 'Customize Dashboard'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards & Widgets Grid */}
      <div className="dashboard-grid" style={{ marginBottom: '2.5rem' }}>
        {activeWidgets.map(card => renderWidgetContent(card))}
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
                        User <strong>{getActorName(log.actor_id)}</strong> performed {log.action.toLowerCase()} on {log.entity_type} {((log.details as { tag?: string } | null | undefined)?.tag) || ''}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Widget Library Modal */}
      {showWidgetLibrary && (
        <div className="modal-overlay" onClick={() => setShowWidgetLibrary(false)} style={{ zIndex: 10000 }}>
          <div className="modal-content" style={{ maxWidth: '580px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Dashboard Widget Library</span>
              <button className="modal-close" onClick={() => setShowWidgetLibrary(false)}>✕</button>
            </div>
            
            <div style={{ maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem 0' }}>
              {WIDGET_LIBRARY.map((w) => {
                // Prevent duplicate metric/analytics instances if desired, or allow adding multiple duplicates
                return (
                  <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', border: '1px solid var(--border)', borderRadius: '10px', background: 'rgba(255,255,255,0.01)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingRight: '1rem', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{w.title}</span>
                        <span style={{ fontSize: '0.625rem', padding: '0.15rem 0.35rem', borderRadius: '4px', background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 600 }}>{w.category}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{w.description}</span>
                    </div>
                    <button
                      onClick={() => addWidget(w.id)}
                      className="btn btn-primary"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', flexShrink: 0 }}
                    >
                      + Add to Dashboard
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
