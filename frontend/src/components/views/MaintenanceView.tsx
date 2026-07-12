import React, { useState } from 'react';
import { Plus, User, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const MaintenanceView: React.FC = () => {
  const { 
    maintenanceRequests, 
    assets, 
    employees, 
    currentRole, 
    raiseMaintenance, 
    approveMaintenance, 
    rejectMaintenance, 
    assignTechnician, 
    resolveMaintenance 
  } = useApp();

  const [showRaiseModal, setShowRaiseModal] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');

  const getAssetName = (id: string) => {
    const asset = assets.find(a => a.id === id);
    return asset ? `${asset.name} [${asset.asset_tag}]` : 'Unknown Asset';
  };

  const getEmployeeName = (id: string) => {
    return employees.find(e => e.id === id)?.name || 'Employee';
  };

  const handleRaiseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await raiseMaintenance({
      asset_id: selectedAssetId,
      description,
      priority
    });
    // Reset form
    setSelectedAssetId('');
    setDescription('');
    setPriority('Medium');
    setShowRaiseModal(false);
  };

  // Group requests by status columns
  const getRequestsByStatus = (status: string) => {
    return maintenanceRequests.filter(r => {
      if (status === 'Pending') return r.status === 'Pending' || r.status === 'Rejected';
      if (status === 'Approved') return r.status === 'Approved';
      if (status === 'In Progress') return r.status === 'Technician Assigned' || r.status === 'In Progress';
      if (status === 'Resolved') return r.status === 'Resolved';
      return false;
    });
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'Critical': return 'var(--danger)';
      case 'High': return 'var(--warning)';
      case 'Medium': return 'var(--accent)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div className="view-container">
      {/* Action Header */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
        <button className="btn btn-primary" onClick={() => setShowRaiseModal(true)}>
          <Plus size={16} />
          <span>Raise Ticket</span>
        </button>
      </div>

      {/* Kanban Board Grid */}
      <div className="kanban-board">
        
        {/* Column 1: Pending */}
        <div className="kanban-column">
          <div className="kanban-column-header" style={{ borderBottomColor: 'var(--text-muted)' }}>
            <span>Pending Approvals ({getRequestsByStatus('Pending').length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto' }}>
            {getRequestsByStatus('Pending').map(req => (
              <div key={req.id} className="kanban-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: getPriorityColor(req.priority), fontWeight: 700 }}>{req.priority} PRIORITY</span>
                  <span style={{ color: 'var(--text-muted)' }}>{req.status}</span>
                </div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.25rem' }}>{getAssetName(req.asset_id)}</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{req.description}</p>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', justifySelf: 'flex-end', marginBottom: '0.5rem' }}>
                  Filed by: {getEmployeeName(req.requested_by)}
                </div>

                {(currentRole === 'Admin' || currentRole === 'Asset Manager') && req.status === 'Pending' && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', flex: 1, justifyContent: 'center' }}
                      onClick={() => approveMaintenance(req.id)}
                    >
                      Approve
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', flex: 1, justifyContent: 'center' }}
                      onClick={() => rejectMaintenance(req.id)}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Approved */}
        <div className="kanban-column">
          <div className="kanban-column-header" style={{ borderBottomColor: 'var(--warning)' }}>
            <span>Approved & Waiting ({getRequestsByStatus('Approved').length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto' }}>
            {getRequestsByStatus('Approved').map(req => (
              <div key={req.id} className="kanban-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: getPriorityColor(req.priority), fontWeight: 700 }}>{req.priority} PRIORITY</span>
                </div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.25rem' }}>{getAssetName(req.asset_id)}</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{req.description}</p>
                
                {(currentRole === 'Admin' || currentRole === 'Asset Manager') && (
                  <button 
                    className="btn btn-primary" 
                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', width: '100%', justifyContent: 'center' }}
                    onClick={() => {
                      const tech = prompt('Enter Technician Name to Assign:') || '';
                      if (tech.trim()) assignTechnician(req.id, tech.trim());
                    }}
                  >
                    Assign Tech
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: In Progress */}
        <div className="kanban-column">
          <div className="kanban-column-header" style={{ borderBottomColor: 'var(--accent)' }}>
            <span>In Repair ({getRequestsByStatus('In Progress').length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto' }}>
            {getRequestsByStatus('In Progress').map(req => (
              <div key={req.id} className="kanban-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: getPriorityColor(req.priority), fontWeight: 700 }}>{req.priority} PRIORITY</span>
                </div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.25rem' }}>{getAssetName(req.asset_id)}</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{req.description}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600, marginBottom: '0.5rem' }}>
                  <User size={12} />
                  <span>Tech: {req.assigned_technician}</span>
                </div>

                {(currentRole === 'Admin' || currentRole === 'Asset Manager') && (
                  <button 
                    className="btn btn-success" 
                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', width: '100%', justifyContent: 'center', backgroundColor: 'var(--success)' }}
                    onClick={() => {
                      const notes = prompt('Enter Resolution Details:') || '';
                      resolveMaintenance(req.id, notes);
                    }}
                  >
                    Resolve Fix
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Column 4: Resolved */}
        <div className="kanban-column">
          <div className="kanban-column-header" style={{ borderBottomColor: 'var(--success)' }}>
            <span>Resolved ({getRequestsByStatus('Resolved').length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto' }}>
            {getRequestsByStatus('Resolved').map(req => (
              <div key={req.id} className="kanban-card" style={{ opacity: 0.65 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>COMPLETED</span>
                </div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.25rem' }}>{getAssetName(req.asset_id)}</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{req.description}</p>
                <div style={{ padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.7rem' }}>
                  <strong>Notes:</strong> {req.resolution_notes}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Raise Request Modal */}
      {showRaiseModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Raise Maintenance Request</h3>
              <button className="modal-close" onClick={() => setShowRaiseModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRaiseSubmit}>
              <div className="form-body">
                <div className="form-group">
                  <label className="form-label">Asset needing Repair</label>
                  <select 
                    className="form-input"
                    value={selectedAssetId}
                    onChange={(e) => setSelectedAssetId(e.target.value)}
                    required
                  >
                    <option value="">Choose Asset...</option>
                    {assets.map(a => <option key={a.id} value={a.id}>{a.name} [{a.asset_tag}]</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select 
                    className="form-input"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Problem Description</label>
                  <textarea 
                    className="form-input"
                    style={{ minHeight: '100px', resize: 'vertical' }}
                    placeholder="Describe the issue, defect details, or maintenance needed..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRaiseModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">File Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
