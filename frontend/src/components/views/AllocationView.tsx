import React, { useState } from 'react';
import { 
  ArrowRightLeft, 
  Check, 
  X, 
  ShieldAlert 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Allocation } from '../../context/AppContext';

export const AllocationView: React.FC = () => {
  const { 
    assets, 
    allocations, 
    transfers, 
    employees, 
    departments,
    currentRole,
    currentEmployee,
    allocateAsset,
    requestTransfer,
    approveTransfer,
    rejectTransfer,
    returnAsset
  } = useApp();

  // Active Tab: 'allocations' | 'transfers'
  const [activeTab, setActiveTab] = useState<'allocations' | 'transfers'>('allocations');

  // Allocate form states
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [targetType, setTargetType] = useState<'Employee' | 'Department'>('Employee');
  const [targetEmployeeId, setTargetEmployeeId] = useState('');
  const [targetDeptId, setTargetDeptId] = useState('');
  const [returnDate, setReturnDate] = useState('');
  
  // Conflict and Transfer states
  const [conflictError, setConflictError] = useState('');
  const [showTransferButton, setShowTransferButton] = useState(false);

  // Return check-in states
  const [selectedAllocForReturn, setSelectedAllocForReturn] = useState<Allocation | null>(null);
  const [checkInNotes, setCheckInNotes] = useState('');
  const [returnCondition, setReturnCondition] = useState<'New' | 'Good' | 'Fair' | 'Poor' | 'Damaged'>('Good');



  // Active Allocations list
  const activeAllocations = allocations.filter(a => a.status === 'Active' || a.status === 'Overdue');

  const getActorName = (id: string) => {
    return employees.find(e => e.id === id)?.name || 'System';
  };

  const getAssetName = (id: string) => {
    const asset = assets.find(a => a.id === id);
    return asset ? `${asset.name} [${asset.asset_tag}]` : 'Unknown Asset';
  };

  const handleAllocateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError('');
    setShowTransferButton(false);

    const data: Partial<Allocation> = {
      asset_id: selectedAssetId,
      allocated_to_type: targetType,
      employee_id: targetType === 'Employee' ? targetEmployeeId : null,
      department_id: targetType === 'Department' ? targetDeptId : null,
      expected_return_date: returnDate || null
    };

    const res = await allocateAsset(data);
    if (!res.success) {
      setConflictError(res.error || 'Allocation error');
      if (res.holderName) {
        setShowTransferButton(true);
      }
    } else {
      // Clear form
      setSelectedAssetId('');
      setTargetEmployeeId('');
      setTargetDeptId('');
      setReturnDate('');
    }
  };

  const handleCreateTransferRequest = async () => {
    const targetAsset = assets.find(a => a.id === selectedAssetId);
    if (!targetAsset) return;

    // Find the current active allocation for from_employee_id
    const currentAlloc = allocations.find(a => a.asset_id === selectedAssetId && a.status === 'Active');
    const fromEmpId = currentAlloc?.employee_id || currentEmployee.id;

    await requestTransfer({
      asset_id: selectedAssetId,
      from_employee_id: fromEmpId,
      to_employee_id: targetType === 'Employee' ? targetEmployeeId : currentEmployee.id
    });

    // Reset states
    setConflictError('');
    setShowTransferButton(false);
    setSelectedAssetId('');
    setTargetEmployeeId('');
    alert('Transfer request raised successfully! Pending manager approval.');
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAllocForReturn) return;
    await returnAsset(selectedAllocForReturn.id, checkInNotes, returnCondition);
    setSelectedAllocForReturn(null);
    setCheckInNotes('');
  };

  return (
    <div className="view-container">
      {/* Tab Selectors */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '2.5rem' }}>
        <button 
          className={`btn ${activeTab === 'allocations' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 0, border: 'none', borderBottom: activeTab === 'allocations' ? '2px solid var(--accent)' : 'none', padding: '1rem 1.5rem', backgroundColor: 'transparent', color: activeTab === 'allocations' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
          onClick={() => setActiveTab('allocations')}
        >
          Active Allocations
        </button>
        <button 
          className={`btn ${activeTab === 'transfers' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 0, border: 'none', borderBottom: activeTab === 'transfers' ? '2px solid var(--accent)' : 'none', padding: '1rem 1.5rem', backgroundColor: 'transparent', color: activeTab === 'transfers' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
          onClick={() => setActiveTab('transfers')}
        >
          Transfer Requests {transfers.filter(t => t.status === 'Pending').length > 0 && `(${transfers.filter(t => t.status === 'Pending').length})`}
        </button>
      </div>

      {activeTab === 'allocations' ? (
        <div style={{ display: 'grid', gridTemplateColumns: (currentRole === 'Admin' || currentRole === 'Asset Manager') ? '1.2fr 1fr' : '1fr', gap: '2rem' }}>
          
          {/* Allocations Table */}
          <div className="table-container" style={{ marginBottom: 0 }}>
            <div className="table-header-bar">
              <span className="table-title">Active Deployments</span>
            </div>

            <div style={{ padding: '0.5rem' }}>
              {activeAllocations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
                  No active asset allocations at the moment.
                </div>
              ) : (
                <table className="custom-table" style={{ border: 'none' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '0.75rem 1rem' }}>Asset</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Allocated To</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Return Due</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeAllocations.map(alloc => {
                      const asset = assets.find(a => a.id === alloc.asset_id);
                      const targetName = alloc.allocated_to_type === 'Employee'
                        ? getActorName(alloc.employee_id || '')
                        : departments.find(d => d.id === alloc.department_id)?.name || 'Department';

                      return (
                        <tr key={alloc.id}>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ fontWeight: 600 }}>{asset?.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{asset?.asset_tag}</div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ fontSize: '0.875rem' }}>{targetName}</div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{alloc.allocated_to_type}</span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>{alloc.expected_return_date || 'Open-Ended'}</td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span className={`badge badge-${alloc.status.toLowerCase()}`}>{alloc.status}</span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                              onClick={() => setSelectedAllocForReturn(alloc)}
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

          {/* Allocation Creation Form (Managers/Admins only) */}
          {(currentRole === 'Admin' || currentRole === 'Asset Manager') && (
            <div className="table-container" style={{ height: 'fit-content' }}>
              <div className="table-header-bar">
                <span className="table-title">Allocate Asset</span>
              </div>
              <form onSubmit={handleAllocateSubmit} className="form-body">
                {conflictError && (
                  <div style={{ padding: '1rem', backgroundColor: 'var(--danger-light)', border: '1px solid var(--danger)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', fontWeight: 600, fontSize: '0.8125rem' }}>
                      <ShieldAlert size={16} />
                      <span>Allocation Conflict</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{conflictError}</p>
                    {showTransferButton && (
                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', marginTop: '0.25rem', width: '100%', justifyContent: 'center' }}
                        onClick={handleCreateTransferRequest}
                      >
                        <ArrowRightLeft size={12} />
                        <span>Raise Transfer Request instead</span>
                      </button>
                    )}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Select Asset</label>
                  <select 
                    className="form-input"
                    value={selectedAssetId}
                    onChange={(e) => {
                      setSelectedAssetId(e.target.value);
                      setConflictError('');
                      setShowTransferButton(false);
                    }}
                    required
                  >
                    <option value="">Choose Asset...</option>
                    {/* List all assets, but mark currently active ones to test conflict trigger */}
                    {assets.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} [{a.asset_tag}] ({a.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Allocate To</label>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                      <input type="radio" checked={targetType === 'Employee'} onChange={() => setTargetType('Employee')} />
                      <span>Employee</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                      <input type="radio" checked={targetType === 'Department'} onChange={() => setTargetType('Department')} />
                      <span>Department</span>
                    </label>
                  </div>

                  {targetType === 'Employee' ? (
                    <select 
                      className="form-input"
                      value={targetEmployeeId}
                      onChange={(e) => setTargetEmployeeId(e.target.value)}
                      required
                    >
                      <option value="">Choose Employee...</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  ) : (
                    <select 
                      className="form-input"
                      value={targetDeptId}
                      onChange={(e) => setTargetDeptId(e.target.value)}
                      required
                    >
                      <option value="">Choose Department...</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Expected Return Date (Optional)</label>
                  <input 
                    type="date"
                    className="form-input"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  Confirm Allocation
                </button>
              </form>
            </div>
          )}
        </div>
      ) : (
        /* Transfers Tab */
        <div className="table-container">
          <div className="table-header-bar">
            <span className="table-title">Transfer Proposals</span>
          </div>

          <div style={{ padding: '0.5rem' }}>
            {transfers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
                No transfer requests have been raised yet.
              </div>
            ) : (
              <table className="custom-table" style={{ border: 'none' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '0.75rem 1rem' }}>Asset</th>
                    <th style={{ padding: '0.75rem 1rem' }}>From Employee</th>
                    <th style={{ padding: '0.75rem 1rem' }}>To Employee</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Requested By</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                    {(currentRole === 'Admin' || currentRole === 'Asset Manager' || currentRole === 'Department Head') && (
                      <th style={{ padding: '0.75rem 1rem' }}>Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {transfers.map(tr => (
                    <tr key={tr.id}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{getAssetName(tr.asset_id)}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>{getActorName(tr.from_employee_id)}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--accent)' }}>{getActorName(tr.to_employee_id)}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>{getActorName(tr.requested_by)}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span className={`badge badge-${tr.status.toLowerCase()}`}>{tr.status}</span>
                      </td>
                      {(currentRole === 'Admin' || currentRole === 'Asset Manager' || currentRole === 'Department Head') && (
                        <td style={{ padding: '0.85rem 1rem' }}>
                          {tr.status === 'Pending' ? (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button 
                                className="btn btn-primary"
                                style={{ padding: '0.35rem 0.5rem', borderRadius: '4px' }}
                                onClick={() => approveTransfer(tr.id)}
                              >
                                <Check size={14} />
                              </button>
                              <button 
                                className="btn btn-danger"
                                style={{ padding: '0.35rem 0.5rem', borderRadius: '4px' }}
                                onClick={() => {
                                  const reason = prompt('Rejection reason:') || '';
                                  rejectTransfer(tr.id, reason);
                                }}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Settled</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Return Asset Check-In Modal */}
      {selectedAllocForReturn && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Check-In Asset Return</h3>
              <button className="modal-close" onClick={() => setSelectedAllocForReturn(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReturnSubmit}>
              <div className="form-body">
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  You are returning: <strong style={{ color: 'var(--text-primary)' }}>{getAssetName(selectedAllocForReturn.asset_id)}</strong>
                </div>

                <div className="form-group">
                  <label className="form-label">Asset Check-In Condition</label>
                  <select 
                    className="form-input"
                    value={returnCondition}
                    onChange={(e) => setReturnCondition(e.target.value as any)}
                  >
                    <option value="New">New</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                    <option value="Damaged">Damaged (Will flag maintenance ticket)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Condition Check-In Notes</label>
                  <textarea 
                    className="form-input"
                    style={{ minHeight: '80px', resize: 'vertical' }}
                    placeholder="Describe return state, physical signs of wear, etc..."
                    value={checkInNotes}
                    onChange={(e) => setCheckInNotes(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedAllocForReturn(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Process Return</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
