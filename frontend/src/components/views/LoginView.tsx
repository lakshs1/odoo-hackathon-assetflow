import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Shield, Key, Mail, User, Briefcase, Hash, AlertCircle } from 'lucide-react';

interface LoginViewProps {
  onAuthSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onAuthSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // SignUp profile details
  const [fullName, setFullName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'manager' | 'auditor' | 'employee'>('admin');
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Fetch departments directly via client-side Supabase for setup purposes
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const { data, error } = await supabase.from('departments').select('id, name');
        if (!error && data) {
          setDepartments(data);
          if (data.length > 0) {
            setSelectedDeptId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching departments:', err);
      }
    };
    fetchDepts();
  }, [isSignUp]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isSignUp) {
        // 1. Sign up user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Signup failed: user not created.');

        const userId = authData.user.id;

        // 2. Self-bootstrap: Create department if none selected/exists
        let deptId = selectedDeptId;
        if (!deptId) {
          const { data: newDept, error: deptErr } = await supabase
            .from('departments')
            .insert({ name: 'Default Division' })
            .select('id')
            .single();
          
          if (deptErr) throw deptErr;
          deptId = newDept.id;
        }

        // 3. Create employee record directly in database (bypassing REST API middleware for bootstrapping)
        const { error: empErr } = await supabase.from('employees').insert({
          user_id: userId,
          department_id: deptId,
          full_name: fullName || 'New Employee',
          employee_code: employeeCode || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        });

        if (empErr) throw empErr;

        // 4. Create user role directly in database (forces selected role for testing/demo convenience)
        const { error: roleErr } = await supabase
          .from('user_roles')
          .upsert({ user_id: userId, role: selectedRole });

        if (roleErr) throw roleErr;

        setMessage('Registration successful! Please sign in using your credentials.');
        setIsSignUp(false);
      } else {
        // Sign In
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        
        onAuthSuccess();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      padding: '2rem',
    }}>
      <div className="table-container" style={{
        width: '100%',
        maxWidth: '460px',
        margin: 0,
        boxShadow: 'var(--shadow-lg), var(--shadow-glow)',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        <div className="table-header-bar" style={{ borderBottom: '1px solid var(--border)', padding: '1.75rem 2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Shield size={22} style={{ color: 'var(--accent)' }} />
              <span className="table-title" style={{ fontSize: '1.25rem' }}>
                {isSignUp ? 'Create AssetFlow Account' : 'Sign In to AssetFlow'}
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              {isSignUp ? 'Fill out your employee profile details to begin.' : 'Enter your credentials to access your organization dashboard.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleAuth} className="form-body" style={{ padding: '2rem' }}>
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--danger)',
              fontSize: '0.8125rem',
              backgroundColor: 'var(--danger-light)',
              border: '1px solid var(--danger)',
              padding: '0.75rem',
              borderRadius: '8px',
              fontWeight: 500,
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div style={{
              color: 'var(--success)',
              fontSize: '0.8125rem',
              backgroundColor: 'var(--success-light)',
              border: '1px solid var(--success)',
              padding: '0.75rem',
              borderRadius: '8px',
              fontWeight: 500,
            }}>
              {message}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                className="form-input"
                style={{ paddingLeft: '2.5rem', width: '100%' }}
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Key size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: '2.5rem', width: '100%' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {isSignUp && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem', width: '100%' }}
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Employee Code</label>
                <div style={{ position: 'relative' }}>
                  <Hash size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem', width: '100%' }}
                    placeholder="EMP-1001"
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Department</label>
                <div style={{ position: 'relative' }}>
                  <Briefcase size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 10 }} />
                  <select
                    className="form-input"
                    style={{ paddingLeft: '2.5rem', width: '100%', appearance: 'none' }}
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                  >
                    {departments.length === 0 ? (
                      <option value="">Create Default Division on Signup</option>
                    ) : (
                      departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">System Role Assignment</label>
                <select
                  className="form-input"
                  style={{ width: '100%' }}
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as any)}
                >
                  <option value="admin">Admin (Full Control)</option>
                  <option value="manager">Asset Manager (Allocations & Maintenance)</option>
                  <option value="auditor">Auditor (Asset Auditing)</option>
                  <option value="employee">Employee (Bookings & Checkouts)</option>
                </select>
              </div>
            </>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', padding: '0.85rem' }}
            disabled={loading}
          >
            {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <a
              onClick={() => setIsSignUp(prev => !prev)}
              style={{
                fontSize: '0.8125rem',
                color: 'var(--accent)',
                cursor: 'pointer',
                fontWeight: 500,
                textDecoration: 'underline',
              }}
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};
