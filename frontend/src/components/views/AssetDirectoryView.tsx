import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  X, 
  History, 
  MapPin, 
  Tag, 
  DollarSign, 
  Calendar 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Asset } from '../../context/AppContext';

interface AssetDirectoryViewProps {
  onRegisterClick: () => void;
  showRegisterModal: boolean;
  onCloseRegisterModal: () => void;
}

export const AssetDirectoryView: React.FC<AssetDirectoryViewProps> = ({
  onRegisterClick,
  showRegisterModal,
  onCloseRegisterModal
}) => {
  const { 
    assets, 
    categories, 
    currentRole, 
    registerAsset, 
    history, 
    employees, 
    allocations
  } = useApp();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // New Asset Form state
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [serial, setSerial] = useState('');
  const [cost, setCost] = useState('');
  const [location, setLocation] = useState('');
  const [condition, setCondition] = useState<'New' | 'Good' | 'Fair' | 'Poor' | 'Damaged'>('New');
  const [isShared, setIsShared] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  
  // Custom specs JSON state
  const [customSpecs, setCustomSpecs] = useState<Record<string, string>>({});

  const activeCategory = categories.find(c => c.id === categoryId);

  const handleCategoryChange = (id: string) => {
    setCategoryId(id);
    setCustomSpecs({}); // reset specs
  };

  const handleSpecChange = (key: string, val: string) => {
    setCustomSpecs(prev => ({ ...prev, [key]: val }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await registerAsset({
      name,
      category_id: categoryId,
      serial_number: serial,
      acquisition_cost: Number(cost),
      location,
      condition,
      is_shared: isShared,
      photo_url: photoUrl || undefined,
      custom_fields: customSpecs as any
    });
    // Reset form
    setName('');
    setCategoryId('');
    setSerial('');
    setCost('');
    setLocation('');
    setCondition('New');
    setIsShared(false);
    setPhotoUrl('');
    setCustomSpecs({});
    onCloseRegisterModal();
  };

  // Filter logic
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = 
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.asset_tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset.serial_number && asset.serial_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (asset.location && asset.location.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'All' || asset.category_id === selectedCategory;
    const matchesStatus = selectedStatus === 'All' || asset.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getCategoryName = (id: string) => {
    return categories.find(c => c.id === id)?.name || 'Uncategorized';
  };

  const getActorName = (id: string) => {
    return employees.find(e => e.id === id)?.name || 'System';
  };

  // Fetch asset historical entries
  const assetHistory = history.filter(h => h.asset_id === selectedAsset?.id);
  // Fetch current active allocation
  const activeAlloc = allocations.find(a => a.asset_id === selectedAsset?.id && a.status === 'Active');
  const activeHolder = activeAlloc 
    ? (activeAlloc.allocated_to_type === 'Employee' 
        ? employees.find(e => e.id === activeAlloc.employee_id)?.name 
        : 'Department') 
    : null;

  return (
    <div className="view-container">
      {/* Search and Filters Bar */}
      <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="form-input" 
            placeholder="Search by name, tag, serial, location..." 
            style={{ paddingLeft: '2.5rem', width: '100%' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select 
          className="form-input" 
          style={{ width: '180px' }}
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="All">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select 
          className="form-input" 
          style={{ width: '160px' }}
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="Available">Available</option>
          <option value="Allocated">Allocated</option>
          <option value="Reserved">Reserved</option>
          <option value="Under Maintenance">Under Maintenance</option>
          <option value="Lost">Lost</option>
          <option value="Retired">Retired</option>
          <option value="Disposed">Disposed</option>
        </select>

        {(currentRole === 'Admin' || currentRole === 'Asset Manager') && (
          <button className="btn btn-primary" onClick={onRegisterClick}>
            <Plus size={16} />
            <span>Register Asset</span>
          </button>
        )}
      </div>

      {/* Assets Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {filteredAssets.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '12px' }}>
            No assets found matching the filter criteria.
          </div>
        ) : (
          filteredAssets.map(asset => (
            <div 
              key={asset.id} 
              className="kpi-card" 
              style={{ height: 'auto', padding: '0', display: 'block', cursor: 'pointer' }}
              onClick={() => setSelectedAsset(asset)}
            >
              <div style={{ width: '100%', height: '160px', overflow: 'hidden', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', position: 'relative' }}>
                <img 
                  src={asset.photo_url} 
                  alt={asset.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
                <span className={`badge badge-${asset.status.toLowerCase().replace(' ', '-')}`} style={{ position: 'absolute', top: '10px', right: '10px' }}>
                  {asset.status}
                </span>
              </div>
              <div style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>{asset.name}</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{asset.asset_tag}</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  {getCategoryName(asset.category_id)}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Loc: {asset.location || 'Unknown'}</span>
                  <span>Cond: {asset.condition}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Asset Detail Drawer */}
      {selectedAsset && (
        <div className="modal-overlay" onClick={() => setSelectedAsset(null)}>
          <div 
            className="modal-content" 
            style={{ 
              maxWidth: '850px', 
              position: 'absolute', 
              right: 0, 
              top: 0, 
              bottom: 0, 
              height: '100vh', 
              borderRadius: 0,
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr',
              animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left Specs Side */}
            <div style={{ borderRight: '1px solid var(--border)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">{selectedAsset.name}</h3>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{selectedAsset.asset_tag}</span>
                </div>
                <button className="modal-close" onClick={() => setSelectedAsset(null)}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ width: '100%', height: '220px', overflow: 'hidden' }}>
                <img 
                  src={selectedAsset.photo_url} 
                  alt={selectedAsset.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              </div>

              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Tag size={16} style={{ color: 'var(--text-muted)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Category</span>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{getCategoryName(selectedAsset.category_id)}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={16} style={{ color: 'var(--text-muted)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Location</span>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{selectedAsset.location || 'N/A'}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <DollarSign size={16} style={{ color: 'var(--text-muted)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Acquisition Cost</span>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>${selectedAsset.acquisition_cost}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Acquisition Date</span>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{selectedAsset.acquisition_date}</span>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>Technical Specs</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Serial Number</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{selectedAsset.serial_number || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Condition</span>
                      <span style={{ fontWeight: 600 }}>{selectedAsset.condition}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Shared / Bookable</span>
                      <span style={{ fontWeight: 600 }}>{selectedAsset.is_shared ? 'Yes' : 'No'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Current Status</span>
                      <span className={`badge badge-${selectedAsset.status.toLowerCase().replace(' ', '-')}`}>{selectedAsset.status}</span>
                    </div>
                    {activeHolder && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', padding: '0.5rem 0', borderTop: '1px dashed var(--border)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Currently Held By</span>
                        <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{activeHolder}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Audit Trail Side */}
            <div style={{ backgroundColor: 'rgba(255,255,255,0.01)', overflowY: 'auto', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <History size={18} style={{ color: 'var(--accent)' }} />
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>Unified History Trail</h4>
              </div>

              <div className="timeline">
                {assetHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '4rem 0', fontSize: '0.8125rem' }}>
                    No history logs for this asset.
                  </div>
                ) : (
                  assetHistory.slice().reverse().map(h => (
                    <div key={h.id} className="timeline-item" style={{ marginBottom: '1.5rem' }}>
                      <div className="timeline-dot" />
                      <div className="timeline-content" style={{ padding: '0.75rem 1rem' }}>
                        <div className="timeline-header" style={{ marginBottom: '0.25rem' }}>
                          <span className="timeline-title" style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{h.event_type}</span>
                          <span className="timeline-time" style={{ fontSize: '0.7rem' }}>
                            {new Date(h.event_date).toLocaleDateString()}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>{h.description}</p>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                          By: {getActorName(h.actor_id)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Register Asset Modal */}
      {showRegisterModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Register New Asset</h3>
              <button className="modal-close" onClick={onCloseRegisterModal}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="form-body">
                <div className="form-group">
                  <label className="form-label">Asset Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. MacBook Pro M4" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select 
                      className="form-input" 
                      value={categoryId} 
                      onChange={(e) => handleCategoryChange(e.target.value)} 
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Serial Number</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. C02XXX0123" 
                      value={serial} 
                      onChange={(e) => setSerial(e.target.value)} 
                    />
                  </div>
                </div>

                {/* Dynamically Render Custom Spec Fields based on selected category */}
                {activeCategory && Object.keys(activeCategory.custom_fields).length > 0 && (
                  <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', display: 'block', marginBottom: '0.75rem' }}>
                      Category Specifications ({activeCategory.name})
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {Object.entries(activeCategory.custom_fields).map(([key, label]) => (
                        <div key={key} className="form-group" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <label className="form-label" style={{ marginBottom: 0 }}>{label}</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            style={{ width: '60%', padding: '0.5rem 0.75rem' }}
                            value={customSpecs[key] || ''}
                            onChange={(e) => handleSpecChange(key, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Acquisition Cost ($)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="e.g. 1500" 
                      value={cost} 
                      onChange={(e) => setCost(e.target.value)} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Location</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. HQ - Floor 3" 
                      value={location} 
                      onChange={(e) => setLocation(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Condition</label>
                    <select 
                      className="form-input" 
                      value={condition} 
                      onChange={(e) => setCondition(e.target.value as any)}
                    >
                      <option value="New">New</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Poor">Poor</option>
                      <option value="Damaged">Damaged</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Photo URL</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="https://images.unsplash.com/..." 
                      value={photoUrl} 
                      onChange={(e) => setPhotoUrl(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="form-group" style={{ flexDirection: 'row', gap: '0.5rem', alignItems: 'center' }}>
                  <input 
                    type="checkbox" 
                    id="isShared" 
                    checked={isShared} 
                    onChange={(e) => setIsShared(e.target.checked)} 
                  />
                  <label htmlFor="isShared" className="form-label" style={{ marginBottom: 0, cursor: 'pointer' }}>
                    Shared Resource (Available for multi-user booking calendars)
                  </label>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={onCloseRegisterModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Asset</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
