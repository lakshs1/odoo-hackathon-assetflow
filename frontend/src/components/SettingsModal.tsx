import React, { useState } from 'react';
import { X, Database, Link, Unlink, CheckCircle, AlertTriangle } from 'lucide-react';
import { updateSupabaseConfig, clearSupabaseConfig, isSupabaseConfigured } from '../supabase';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const isConfigured = isSupabaseConfigured();
  
  const [url, setUrl] = useState(localStorage.getItem('supabase_url') || '');
  const [key, setKey] = useState(localStorage.getItem('supabase_key') || '');
  const [error, setError] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !key.trim()) {
      setError('Please provide both the Supabase URL and Anon Key.');
      return;
    }
    if (!url.startsWith('https://')) {
      setError('Invalid Supabase URL. It must begin with https://');
      return;
    }
    setError('');
    updateSupabaseConfig(url.trim(), key.trim());
  };

  const handleClear = () => {
    clearSupabaseConfig();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={20} className="text-indigo" style={{ color: '#6366f1' }} />
            <span className="modal-title">Supabase Database Link</span>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="form-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', backgroundColor: isConfigured ? 'var(--success-light)' : 'var(--warning-light)', border: `1px solid ${isConfigured ? 'var(--success)' : 'var(--warning)'}`, borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: isConfigured ? 'var(--success)' : 'var(--warning)' }}>
              {isConfigured ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
              <span>{isConfigured ? 'Connected to Supabase' : 'Sandbox Demo Mode'}</span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {isConfigured 
                ? 'Your application is reading and writing data directly to your remote Supabase PostgreSQL database.'
                : 'Using local database simulation. You can test all features (bookings, conflicts, audits, role gates) out-of-the-box. Enter your credentials below to link your real project.'}
            </p>
          </div>

          {error && (
            <div style={{ color: 'var(--danger)', fontSize: '0.8125rem', fontWeight: 500 }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Supabase URL</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="https://xxxx.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isConfigured}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Supabase Anon Key</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              disabled={isConfigured}
            />
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            To get these values: Go to <strong>Supabase Dashboard</strong> -&gt; <strong>Project Settings</strong> -&gt; <strong>API</strong>.
          </div>

          <div className="form-actions" style={{ padding: '1rem 0 0 0', borderTop: 'none' }}>
            {isConfigured ? (
              <button type="button" className="btn btn-danger" onClick={handleClear} style={{ width: '100%', justifyContent: 'center' }}>
                <Unlink size={16} />
                <span>Disconnect Database</span>
              </button>
            ) : (
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                <Link size={16} />
                <span>Link Database</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
