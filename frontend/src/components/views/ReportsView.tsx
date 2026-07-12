import React from 'react';
import { useApp } from '../../context/AppContext';

export const ReportsView: React.FC = () => {
  const { assets, allocations, departments, maintenanceRequests } = useApp();

  // Metrics aggregations
  const totalAssets = assets.length;
  const activeAllocations = assets.filter(a => a.status === 'Allocated').length;
  const inRepair = assets.filter(a => a.status === 'Under Maintenance').length;
  
  // Utilization rate
  const utilizationRate = totalAssets > 0 ? Math.round((activeAllocations / totalAssets) * 100) : 0;

  // Custom SVG Bar Chart calculation for departments
  const departmentChartData = departments.map(d => {
    // count assets allocated to this department
    const allocCount = allocations.filter(a => a.department_id === d.id && a.status === 'Active').length;
    return { name: d.name, count: allocCount };
  });

  const maxCount = Math.max(...departmentChartData.map(d => d.count), 1);

  // SVG Area Chart Points for utilization trend over 6 months
  const utilizationTrend = [
    { month: 'Jan', rate: 45 },
    { month: 'Feb', rate: 58 },
    { month: 'Mar', rate: 64 },
    { month: 'Apr', rate: 70 },
    { month: 'May', rate: 82 },
    { month: 'Jun', rate: utilizationRate || 75 }
  ];

  // Map utilization values to SVG coordinates (width: 500, height: 180)
  const chartWidth = 500;
  const chartHeight = 180;
  const padding = 20;

  const points = utilizationTrend.map((t, idx) => {
    const x = padding + (idx * (chartWidth - padding * 2)) / (utilizationTrend.length - 1);
    const y = chartHeight - padding - (t.rate / 100) * (chartHeight - padding * 2);
    return { x, y, month: t.month, rate: t.rate };
  });

  const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`;

  // Heatmap hourly distribution (Hour vs Day of week)
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = ['09:00', '11:00', '13:00', '15:00', '17:00'];

  const getHeatmapColorClass = (dayIdx: number, hourIdx: number) => {
    const sum = (dayIdx + hourIdx) % 5;
    if (dayIdx >= 5) return 'level-0'; // Sat, Sun have lower levels
    return `level-${sum}`;
  };

  return (
    <div className="view-container">
      {/* Dynamic Summary KPIs */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '2.5rem' }}>
        <div className="kpi-card" style={{ height: '110px', justifyContent: 'center' }}>
          <div className="kpi-title">Global Utilization</div>
          <div className="kpi-value" style={{ color: 'var(--accent)' }}>{utilizationRate}%</div>
          <div className="kpi-meta">Active checkouts</div>
        </div>

        <div className="kpi-card" style={{ height: '110px', justifyContent: 'center' }}>
          <div className="kpi-title">Catalog Health Index</div>
          <div className="kpi-value" style={{ color: 'var(--success)' }}>
            {totalAssets > 0 ? Math.round(((totalAssets - inRepair) / totalAssets) * 100) : 100}%
          </div>
          <div className="kpi-meta">Exclude repair items</div>
        </div>

        <div className="kpi-card" style={{ height: '110px', justifyContent: 'center' }}>
          <div className="kpi-title">Total Registered Items</div>
          <div className="kpi-value">{totalAssets}</div>
          <div className="kpi-meta">Within master catalog</div>
        </div>

        <div className="kpi-card" style={{ height: '110px', justifyContent: 'center' }}>
          <div className="kpi-title">Total Maintenance Cost</div>
          <div className="kpi-value" style={{ color: 'var(--warning)' }}>
            ${maintenanceRequests.filter(r => r.status === 'Resolved').length * 240}
          </div>
          <div className="kpi-meta">Calculated index</div>
        </div>
      </div>

      {/* SVG Analytics Graphs */}
      <div className="analytics-grid">
        
        {/* Utilization Line Graph */}
        <div className="graph-card">
          <div className="graph-title">6-Month Asset Checkout Curve</div>
          <div style={{ position: 'relative', width: '100%', height: '200px' }}>
            <svg className="svg-chart" viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ overflow: 'visible' }}>
              <defs>
                <linearGradient id="gradient-accent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              
              {/* Horizontal Grid lines */}
              {[0, 25, 50, 75, 100].map((val, idx) => {
                const y = chartHeight - padding - (val / 100) * (chartHeight - padding * 2);
                return (
                  <g key={idx}>
                    <line x1={padding} y1={y} x2={chartWidth - padding} y2={y} className="svg-grid-line" />
                    <text x={padding - 5} y={y + 4} fill="var(--text-muted)" fontSize="9" textAnchor="end">{val}%</text>
                  </g>
                );
              })}

              {/* Area & Line */}
              <path d={areaPath} className="svg-area" />
              <path d={linePath} className="svg-line" />

              {/* Data points */}
              {points.map((p, idx) => (
                <g key={idx}>
                  <circle cx={p.x} cy={p.y} r="5" fill="var(--bg-card)" stroke="var(--accent)" strokeWidth="3" />
                  <text x={p.x} y={chartHeight - 4} fill="var(--text-secondary)" fontSize="10" textAnchor="middle">{p.month}</text>
                  <text x={p.x} y={p.y - 8} fill="var(--text-primary)" fontSize="10" fontWeight="600" textAnchor="middle">{p.rate}%</text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Department Bar Graph */}
        <div className="graph-card">
          <div className="graph-title">Asset Deployment by Department</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '180px', justifyContent: 'center' }}>
            {departmentChartData.map((d, idx) => {
              const pct = (d.count / maxCount) * 100;
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ width: '100px', fontSize: '0.8125rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {d.name}
                  </span>
                  <div style={{ flex: 1, height: '16px', backgroundColor: 'var(--bg-app)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div style={{ width: `${pct}%`, height: '100%', backgroundColor: 'var(--accent)', borderRadius: '3px', transition: 'width 1s ease-out' }} />
                  </div>
                  <span style={{ width: '30px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {d.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Heatmap Grid */}
      <div className="graph-card" style={{ marginBottom: '2.5rem' }}>
        <div className="graph-title">Resource Booking Heatmap (Peak Reservation Hour)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '1rem' }}>
          
          {/* Weekday Labels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'space-around', padding: '0.25rem 0' }}>
            {weekdays.map(d => (
              <span key={d} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{d}</span>
            ))}
          </div>

          {/* Grid Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {weekdays.map((_, dayIdx) => (
              <div key={dayIdx} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                {hours.map((_, hrIdx) => (
                  <div 
                    key={hrIdx} 
                    className={`heatmap-cell ${getHeatmapColorClass(dayIdx, hrIdx)}`}
                    title={`Day: ${weekdays[dayIdx]}, Slot: ${hours[hrIdx]}`}
                  >
                    {hours[hrIdx]}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
