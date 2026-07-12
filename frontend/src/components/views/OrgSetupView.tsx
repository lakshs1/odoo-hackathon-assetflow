import React, { useState } from 'react';
import { Users, FolderGit, Building, ShieldAlert, Award, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const OrgSetupView: React.FC = () => {
  const { 
    departments, 
    categories, 
    employees, 
    currentRole,
    addCustomDepartment,
    addCustomCategory,
    promoteEmployee
  } = useApp();

  // Tab state: 'departments' | 'categories' | 'directory'
  const [activeTab, setActiveTab] = useState<'departments' | 'categories' | 'directory'>('departments');

  // Form states
  const [deptName, setDeptName] = useState('');
  const [deptHeadId, setDeptHeadId] = useState('');
  const [deptParentId, setDeptParentId] = useState('');

  const [catName, setCatName] = useState('');
  const [customFieldName, setCustomFieldName] = useState('');
  const [customFieldLabel, setCustomFieldLabel] = useState('');
  const [categoryFields, setCategoryFields] = useState<Record<string, string>>({});

  if (currentRole !== 'Admin') {
    return (
      <div className="view-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
        <ShieldAlert size={48} style={{ color: 'var(--danger)' }} />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Access Denied</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>You must hold the "Admin" role to access Organization Setup. Swap views in the top-right header.</p>
      </div>
    );
  }

  const handleDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addCustomDepartment({
      name: deptName,
      head_id: deptHeadId || null,
      parent_department_id: deptParentId || null
    });
    setDeptName('');
    setDeptHeadId('');
    setDeptParentId('');
  };

  const handleAddField = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!customFieldName.trim() || !customFieldLabel.trim()) return;
    setCategoryFields(prev => ({ ...prev, [customFieldName.trim()]: customFieldLabel.trim() }));
    setCustomFieldName('');
    setCustomFieldLabel('');
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addCustomCategory({
      name: catName,
      custom_fields: categoryFields
    });
    setCatName('');
    setCategoryFields({});
  };

  const getActorName = (id: string | null) => {
    if (!id) return 'Open slot';
    return employees.find(e => e.id === id)?.name || 'Employee';
  };

  const getDeptName = (id: string | null) => {
    if (!id) return 'None';
    return departments.find(d => d.id === id)?.name || 'Department';
  };

  return (
    <div className="view-container">
      {/* Sub-Tabs Selector */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '2.5rem' }}>
        <button 
          className={`btn ${activeTab === 'departments' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 0, border: 'none', borderBottom: activeTab === 'departments' ? '2px solid var(--accent)' : 'none', padding: '1rem 1.5rem', backgroundColor: 'transparent', color: activeTab === 'departments' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
          onClick={() => setActiveTab('departments')}
        >
          <Building size={16} />
          <span>Departments</span>
        </button>
        <button 
          className={`btn ${activeTab === 'categories' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 0, border: 'none', borderBottom: activeTab === 'categories' ? '2px solid var(--accent)' : 'none', padding: '1rem 1.5rem', backgroundColor: 'transparent', color: activeTab === 'categories' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
          onClick={() => setActiveTab('categories')}
        >
          <FolderGit size={16} />
          <span>Asset Categories</span>
        </button>
        <button 
          className={`btn ${activeTab === 'directory' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 0, border: 'none', borderBottom: activeTab === 'directory' ? '2px solid var(--accent)' : 'none', padding: '1rem 1.5rem', backgroundColor: 'transparent', color: activeTab === 'directory' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
          onClick={() => setActiveTab('directory')}
        >
          <Users size={16} />
          <span>Employee Directory</span>
        </button>
      </div>

      {activeTab === 'departments' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
          
          {/* Department List */}
          <div className="table-container" style={{ marginBottom: 0 }}>
            <div className="table-header-bar">
              <span className="table-title">Registered Departments</span>
            </div>
            <div style={{ padding: '0.5rem' }}>
              <table className="custom-table" style={{ border: 'none' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '0.75rem 1rem' }}>Department Name</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Head of Department</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Parent Group</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map(dept => (
                    <tr key={dept.id}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{dept.name}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>{getActorName(dept.head_id)}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>{getDeptName(dept.parent_department_id)}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span className="badge badge-available">{dept.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Department Form */}
          <div className="table-container" style={{ height: 'fit-content' }}>
            <div className="table-header-bar">
              <span className="table-title">Add Department</span>
            </div>
            <form onSubmit={handleDeptSubmit} className="form-body">
              <div className="form-group">
                <label className="form-label">Department Name</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="e.g. Quality Assurance"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Department Head (HoD)</label>
                <select 
                  className="form-input"
                  value={deptHeadId}
                  onChange={(e) => setDeptHeadId(e.target.value)}
                >
                  <option value="">Select Head...</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Parent Division (Hierarchy)</label>
                <select 
                  className="form-input"
                  value={deptParentId}
                  onChange={(e) => setDeptParentId(e.target.value)}
                >
                  <option value="">None (Top-Level)</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Create Department
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
          
          {/* Categories list */}
          <div className="table-container" style={{ marginBottom: 0 }}>
            <div className="table-header-bar">
              <span className="table-title">Asset Categories</span>
            </div>
            <div style={{ padding: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {categories.map(cat => (
                  <div key={cat.id} style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.5rem' }}>{cat.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <strong>Custom Fields:</strong>
                      {Object.keys(cat.custom_fields).length === 0 ? ' None' : (
                        <ul style={{ paddingLeft: '1rem', marginTop: '0.25rem' }}>
                          {Object.entries(cat.custom_fields).map(([k, v]) => (
                            <li key={k}>{v}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Create Category Form with JSON specs builder */}
          <div className="table-container" style={{ height: 'fit-content' }}>
            <div className="table-header-bar">
              <span className="table-title">Add Asset Category</span>
            </div>
            <form onSubmit={handleCategorySubmit} className="form-body">
              <div className="form-group">
                <label className="form-label">Category Name</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="e.g. Office Supplies"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  required
                />
              </div>

              {/* Specification fields builder */}
              <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', display: 'block', marginBottom: '0.5rem' }}>
                  Category Custom Fields (JSONB Specs Builder)
                </span>
                
                {Object.keys(categoryFields).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                    {Object.entries(categoryFields).map(([k, v]) => (
                      <span key={k} style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', backgroundColor: 'var(--accent-light)', color: 'var(--accent)', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {v} ({k})
                        <X size={10} style={{ cursor: 'pointer' }} onClick={() => {
                          const cpy = { ...categoryFields };
                          delete cpy[k];
                          setCategoryFields(cpy);
                        }} />
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Key (e.g. ram)" 
                    style={{ padding: '0.5rem' }} 
                    value={customFieldName}
                    onChange={(e) => setCustomFieldName(e.target.value)}
                  />
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Label (e.g. RAM Size)" 
                    style={{ padding: '0.5rem' }} 
                    value={customFieldLabel}
                    onChange={(e) => setCustomFieldLabel(e.target.value)}
                  />
                </div>
                <button type="button" className="btn btn-secondary" style={{ width: '100%', padding: '0.5rem', justifyContent: 'center' }} onClick={handleAddField}>
                  Add Field
                </button>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Create Category
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'directory' && (
        /* Employee Directory & Promotion Tools */
        <div className="table-container">
          <div className="table-header-bar">
            <span className="table-title">Employee Registry & Permissions</span>
          </div>

          <div style={{ padding: '0.5rem' }}>
            <table className="custom-table" style={{ border: 'none' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.75rem 1rem' }}>Employee Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Email Account</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Department</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Permissions Role</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Promotion action</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{emp.name}</td>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{emp.email}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>{getDeptName(emp.department_id)}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span className={`badge ${emp.role === 'Admin' ? 'badge-lost' : emp.role === 'Asset Manager' ? 'badge-maintenance' : emp.role === 'Department Head' ? 'badge-allocated' : 'badge-available'}`}>
                        {emp.role}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          onClick={() => {
                            const newRole = prompt('Set role (Admin / Asset Manager / Department Head / Employee):') || '';
                            if (['Admin', 'Asset Manager', 'Department Head', 'Employee'].includes(newRole)) {
                              promoteEmployee(emp.id, newRole as any);
                            }
                          }}
                        >
                          <Award size={12} />
                          <span>Promote</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
