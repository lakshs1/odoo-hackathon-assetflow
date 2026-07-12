import React, { useState, useRef } from 'react';
import { X, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AuditView: React.FC = () => {
  const { 
    auditCycles, 
    auditResults, 
    assets, 
    employees, 
    departments,
    currentRole,
    createAuditCycle,
    submitAuditResult,
    closeAuditCycle
  } = useApp();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);

  // New Cycle Form states
  const [name, setName] = useState('');
  const [scopeType, setScopeType] = useState<'Department' | 'Location' | 'All'>('All');
  const [scopeDeptId, setScopeDeptId] = useState('');
  const [scopeLocation, setScopeLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [assignedAuditors, setAssignedAuditors] = useState<string[]>([]);

  // Confetti Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const activeCycle = auditCycles.find(c => c.id === selectedCycleId);

  // Fetch assets in scope for active cycle
  const getScopedAssets = () => {
    if (!activeCycle) return [];
    return assets.filter(a => {
      if (activeCycle.scope_type === 'All') return true;
      if (activeCycle.scope_type === 'Department') {
        // Need to check if asset's current allocation is in that department
        // (For simulation, or we can just filter by current location / allocation)
        return true;
      }
      if (activeCycle.scope_type === 'Location') {
        return a.location && a.location.toLowerCase().includes(activeCycle.scope_location?.toLowerCase() || '');
      }
      return true;
    });
  };

  const scopedAssets = getScopedAssets();

  const getResultForAsset = (assetId: string) => {
    return auditResults.find(r => r.audit_cycle_id === selectedCycleId && r.asset_id === assetId);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createAuditCycle({
      name,
      scope_type: scopeType,
      scope_department_id: scopeType === 'Department' ? scopeDeptId : null,
      scope_location: scopeType === 'Location' ? scopeLocation : null,
      start_date: startDate,
      end_date: endDate
    }, assignedAuditors);

    // Reset Form
    setName('');
    setScopeType('All');
    setScopeDeptId('');
    setScopeLocation('');
    setStartDate('');
    setEndDate('');
    setAssignedAuditors([]);
    setShowCreateModal(false);
  };

  const handleVerifyAsset = async (assetId: string, status: 'Verified' | 'Missing' | 'Damaged') => {
    if (!selectedCycleId) return;
    const notes = prompt(`Enter audit notes for this asset (${status}):`) || '';
    await submitAuditResult({
      audit_cycle_id: selectedCycleId,
      asset_id: assetId,
      verification_status: status,
      notes: notes
    });
  };

  // Canvas Confetti simulation
  const runConfetti = () => {
    setShowConfetti(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#ec4899'];
    const particles = Array.from({ length: 150 }).map(() => ({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 15,
      vy: (Math.random() - 0.5) * 15 - 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      radius: Math.random() * 5 + 3,
      alpha: 1,
      gravity: 0.2
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.01;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(p.alpha, 0);
        ctx.fill();
      });

      if (particles.some(p => p.alpha > 0)) {
        requestAnimationFrame(render);
      } else {
        setShowConfetti(false);
      }
    };
    render();
  };

  const handleCloseCycleClick = async () => {
    if (!selectedCycleId) return;
    await closeAuditCycle(selectedCycleId);
    runConfetti();
  };

  return (
    <div className="view-container">
      {showConfetti && <canvas ref={canvasRef} className="confetti-canvas" />}

      {/* Split Layout: Cycle selection or execution panel */}
      {!selectedCycleId ? (
        <div>
          {/* Action Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Review periodic inventory integrity verifications</p>
            </div>
            {currentRole === 'Admin' && (
              <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                <Plus size={16} />
                <span>Spin Up Audit Cycle</span>
              </button>
            )}
          </div>

          {/* Audit Cycles Table */}
          <div className="table-container">
            <div className="table-header-bar">
              <span className="table-title">Audit Log cycles</span>
            </div>

            <div style={{ padding: '0.5rem' }}>
              {auditCycles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
                  No audit verification cycles created yet.
                </div>
              ) : (
                <table className="custom-table" style={{ border: 'none' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '0.75rem 1rem' }}>Audit Name</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Scope Target</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Date range</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditCycles.map(cycle => (
                      <tr key={cycle.id}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{cycle.name}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ fontWeight: 600 }}>{cycle.scope_type}</span>
                          {cycle.scope_type === 'Location' && ` - ${cycle.scope_location}`}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>{cycle.start_date} to {cycle.end_date}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span className={`badge badge-${cycle.status === 'Completed' ? 'available' : cycle.status === 'Active' ? 'allocated' : 'reserved'}`}>
                            {cycle.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <button 
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                            onClick={() => setSelectedCycleId(cycle.id)}
                          >
                            {cycle.status === 'Completed' ? 'View Report' : 'Enter Audit'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Inside Active Audit Cycle */
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', marginBottom: '0.5rem' }} onClick={() => setSelectedCycleId(null)}>
                &larr; Back to Cycles
              </button>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{activeCycle?.name} Execution</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Scope: <strong>{activeCycle?.scope_type}</strong> | Target: <strong>{activeCycle?.scope_location || 'All'}</strong>
              </p>
            </div>

            {currentRole === 'Admin' && activeCycle?.status === 'Active' && (
              <button 
                className="btn btn-success" 
                style={{ backgroundColor: 'var(--success)' }}
                onClick={handleCloseCycleClick}
              >
                Close Audit & Reconcile
              </button>
            )}
          </div>

          {/* Scoped Assets Verification Table */}
          <div className="table-container">
            <div className="table-header-bar">
              <span className="table-title">Inventory Verification Checklist</span>
            </div>

            <div style={{ padding: '0.5rem' }}>
              <table className="custom-table" style={{ border: 'none' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '0.75rem 1rem' }}>Asset specifications</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Current location</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Verification status</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Auditor Notes</th>
                    {activeCycle?.status === 'Active' && (
                      <th style={{ padding: '0.75rem 1rem' }}>Assess Action</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {scopedAssets.map(asset => {
                    const result = getResultForAsset(asset.id);
                    
                    return (
                      <tr key={asset.id}>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: 600 }}>{asset.name}</div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{asset.asset_tag}</span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>{asset.location || 'N/A'}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          {result ? (
                            <span className={`badge badge-${result.verification_status === 'Verified' ? 'available' : result.verification_status === 'Missing' ? 'lost' : 'maintenance'}`}>
                              {result.verification_status}
                            </span>
                          ) : (
                            <span className="badge badge-reserved">Unchecked</span>
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {result?.notes || 'No comments'}
                        </td>
                        {activeCycle?.status === 'Active' && (
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', color: 'var(--success)', borderColor: 'rgba(16,185,129,0.2)' }}
                                onClick={() => handleVerifyAsset(asset.id, 'Verified')}
                              >
                                Match
                              </button>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }}
                                onClick={() => handleVerifyAsset(asset.id, 'Missing')}
                              >
                                Missing
                              </button>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', color: 'var(--warning)', borderColor: 'rgba(245,158,11,0.2)' }}
                                onClick={() => handleVerifyAsset(asset.id, 'Damaged')}
                              >
                                Damaged
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Spin Up Audit Cycle Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Spin Up Audit Cycle</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="form-body">
                <div className="form-group">
                  <label className="form-label">Audit Cycle Name</label>
                  <input 
                    type="text"
                    className="form-input"
                    placeholder="e.g. Q3 Electronics Verification"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Scope Target Type</label>
                    <select 
                      className="form-input"
                      value={scopeType}
                      onChange={(e) => setScopeType(e.target.value as any)}
                    >
                      <option value="All">Complete Catalog (All)</option>
                      <option value="Department">By Department</option>
                      <option value="Location">By Physical Location</option>
                    </select>
                  </div>

                  {scopeType === 'Department' ? (
                    <div className="form-group">
                      <label className="form-label">Target Department</label>
                      <select 
                        className="form-input"
                        value={scopeDeptId}
                        onChange={(e) => setScopeDeptId(e.target.value)}
                        required
                      >
                        <option value="">Select Dept...</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  ) : scopeType === 'Location' ? (
                    <div className="form-group">
                      <label className="form-label">Physical Location</label>
                      <input 
                        type="text"
                        className="form-input"
                        placeholder="e.g. HQ - Floor 3"
                        value={scopeLocation}
                        onChange={(e) => setScopeLocation(e.target.value)}
                        required
                      />
                    </div>
                  ) : <div />}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input 
                      type="date"
                      className="form-input"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input 
                      type="date"
                      className="form-input"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Assign Auditors (Multi-select)</label>
                  <select 
                    multiple
                    className="form-input"
                    style={{ minHeight: '80px' }}
                    value={assignedAuditors}
                    onChange={(e) => setAssignedAuditors(Array.from(e.target.selectedOptions, option => option.value))}
                    required
                  >
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
                  </select>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Hold Ctrl/Cmd to select multiple staff</span>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Start Cycle</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
