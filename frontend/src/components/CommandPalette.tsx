import React, { useState, useEffect, useRef } from 'react';
import { Command, CornerDownLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  setActiveView: (view: string) => void;
  onRegisterAssetClick: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ 
  isOpen, 
  onClose, 
  setActiveView, 
  onRegisterAssetClick 
}) => {
  const { assets, switchRole } = useApp();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle hotkey (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // will be toggled in parent
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Build commands list
  const systemCommands = [
    { type: 'navigation', label: 'Go to Dashboard', shortcut: 'G D', action: () => { setActiveView('dashboard'); onClose(); } },
    { type: 'navigation', label: 'Go to Asset Directory', shortcut: 'G A', action: () => { setActiveView('assets'); onClose(); } },
    { type: 'navigation', label: 'Go to Allocations & Transfers', shortcut: 'G L', action: () => { setActiveView('allocations'); onClose(); } },
    { type: 'navigation', label: 'Go to Resource Bookings', shortcut: 'G B', action: () => { setActiveView('bookings'); onClose(); } },
    { type: 'navigation', label: 'Go to Maintenance Management', shortcut: 'G M', action: () => { setActiveView('maintenance'); onClose(); } },
    { type: 'navigation', label: 'Go to Asset Auditing', shortcut: 'G C', action: () => { setActiveView('audits'); onClose(); } },
    { type: 'action', label: 'Register New Asset', shortcut: '⌘ N', action: () => { onRegisterAssetClick(); onClose(); } },
    { type: 'role', label: 'Switch Role to Admin', shortcut: 'R A', action: () => { switchRole('Admin'); onClose(); } },
    { type: 'role', label: 'Switch Role to Asset Manager', shortcut: 'R M', action: () => { switchRole('Asset Manager'); onClose(); } },
    { type: 'role', label: 'Switch Role to Employee', shortcut: 'R E', action: () => { switchRole('Employee'); onClose(); } },
  ];

  // Merge asset searches
  const assetCommands = assets.map(a => ({
    type: 'asset',
    label: `Find Asset: ${a.name} [${a.asset_tag}]`,
    shortcut: a.status,
    action: () => {
      setActiveView('assets');
      // Store asset details in memory to focus it, or simulate focus
      onClose();
    }
  }));

  const allItems = [...systemCommands, ...assetCommands];
  
  // Filter list
  const filtered = allItems.filter(item => 
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div 
        className="command-palette" 
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="command-input-container">
          <Command size={18} style={{ color: 'var(--text-muted)', marginRight: '0.75rem' }} />
          <input 
            ref={inputRef}
            type="text" 
            className="command-input" 
            placeholder="Type a command or search assets..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', border: '1px solid var(--border)', padding: '0.125rem 0.375rem', borderRadius: '4px' }}>ESC</span>
        </div>

        <div className="command-list">
          {filtered.length === 0 ? (
            <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No matching actions or assets found.
            </div>
          ) : (
            filtered.map((item, index) => (
              <div 
                key={index} 
                className={`command-item ${selectedIndex === index ? 'selected' : ''}`}
                onClick={item.action}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ 
                    fontSize: '0.6875rem', 
                    padding: '0.125rem 0.375rem', 
                    borderRadius: '4px',
                    backgroundColor: item.type === 'navigation' ? 'var(--accent-light)' : item.type === 'role' ? 'var(--success-light)' : 'rgba(255,255,255,0.05)',
                    color: item.type === 'navigation' ? 'var(--accent)' : item.type === 'role' ? 'var(--success)' : 'var(--text-secondary)',
                    fontWeight: 600
                  }}>
                    {item.type.toUpperCase()}
                  </span>
                  <span className="command-label">{item.label}</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="command-shortcut">{item.shortcut}</span>
                  {selectedIndex === index && <CornerDownLeft size={12} style={{ color: 'var(--text-muted)' }} />}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
