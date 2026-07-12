import React, { useState, useEffect } from 'react';
import { X, Palette, RefreshCw, Moon, Sun } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface CustomizeModalProps {
  onClose: () => void;
}

interface SwatchPreset {
  id: 'sakura' | 'odoo';
  name: string;
  primary: string;
  secondary: string;
  bgDark: string;
  bgLight: string;
  description: string;
}

const COLOR_PRESETS: SwatchPreset[] = [
  { 
    id: 'sakura',
    name: 'Sakura Fall', 
    primary: '#ff7e93', 
    secondary: '#be123c', 
    bgDark: '#120204', 
    bgLight: '#fff0f2',
    description: "Japan's single-line Mt. Fuji & warm cherry tones"
  },
  { 
    id: 'odoo',
    name: 'Odoo Premium', 
    primary: '#714b67', 
    secondary: '#5e3855', 
    bgDark: '#1e081a', 
    bgLight: '#f6ebf4',
    description: "Odoo's purple themes and brand background illustration"
  },
];

export const CustomizeModal: React.FC<CustomizeModalProps> = ({ onClose }) => {
  const { theme, toggleTheme, accentColor, accentHoverColor, bgColor, preset, setPreset, setThemeColors } = useApp();
  
  const [customPrimary, setCustomPrimary] = useState(accentColor);
  const [customSecondary, setCustomSecondary] = useState(accentHoverColor);
  const [customBg, setCustomBg] = useState(bgColor);

  // Sync color states with context updates (e.g. if theme modes switch or preset changes)
  useEffect(() => {
    setCustomPrimary(accentColor);
    setCustomSecondary(accentHoverColor);
    setCustomBg(bgColor);
  }, [accentColor, accentHoverColor, bgColor]);

  const adjustColorBrightness = (hex: string, percent: number) => {
    if (!hex.startsWith('#') || hex.length !== 7) return hex;
    let R = parseInt(hex.substring(1, 3), 16);
    let G = parseInt(hex.substring(3, 5), 16);
    let B = parseInt(hex.substring(5, 7), 16);

    R = Math.min(255, Math.max(0, Math.round(R * (100 + percent) / 100)));
    G = Math.min(255, Math.max(0, Math.round(G * (100 + percent) / 100)));
    B = Math.min(255, Math.max(0, Math.round(B * (100 + percent) / 100)));

    const rHex = R.toString(16).padStart(2, '0');
    const gHex = G.toString(16).padStart(2, '0');
    const bHex = B.toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
  };

  const generateTintedBg = (accent: string, currentTheme: 'dark' | 'light') => {
    if (!accent.startsWith('#') || accent.length !== 7) {
      return currentTheme === 'dark' ? '#000000' : '#f4f4f5';
    }
    let R = parseInt(accent.substring(1, 3), 16);
    let G = parseInt(accent.substring(3, 5), 16);
    let B = parseInt(accent.substring(5, 7), 16);
    
    if (currentTheme === 'dark') {
      R = Math.max(2, Math.round(R * 0.05));
      G = Math.max(2, Math.round(G * 0.05));
      B = Math.max(3, Math.round(B * 0.05));
    } else {
      R = Math.min(255, Math.round(R + (255 - R) * 0.96));
      G = Math.min(255, Math.round(G + (255 - G) * 0.96));
      B = Math.min(255, Math.round(B + (255 - B) * 0.96));
    }
    
    const rHex = R.toString(16).padStart(2, '0');
    const gHex = G.toString(16).padStart(2, '0');
    const bHex = B.toString(16).padStart(2, '0');
    return `#${rHex}${gHex}${bHex}`;
  };

  const applyPresetColors = (presetId: 'sakura' | 'odoo') => {
    setPreset(presetId);
  };

  const handlePrimaryChange = (val: string) => {
    if (!val.startsWith('#') || val.length !== 7) {
      setCustomPrimary(val);
      return;
    }
    setCustomPrimary(val);
    const sec = adjustColorBrightness(val, -15);
    const bg = generateTintedBg(val, theme);
    setCustomSecondary(sec);
    setCustomBg(bg);
    setThemeColors(val, sec, bg);
  };

  const handleSecondaryChange = (val: string) => {
    setCustomSecondary(val);
    setThemeColors(customPrimary, val, customBg);
  };

  const handleBgChange = (val: string) => {
    setCustomBg(val);
    setThemeColors(customPrimary, customSecondary, val);
  };

  const handleThemeModeSwitch = (mode: 'dark' | 'light') => {
    if (mode === theme) return;
    toggleTheme();
  };

  const handleReset = () => {
    const defaultBg = theme === 'dark' ? '#000000' : '#f4f4f5';
    setThemeColors('#6366f1', '#4f46e5', defaultBg);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Palette size={20} style={{ color: 'var(--accent)' }} />
            <span className="modal-title">Theme Settings & Presets</span>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="form-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
          {/* Theme Mode Selector */}
          <div className="form-group">
            <label className="form-label">Theme Mode</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button 
                type="button" 
                className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => handleThemeModeSwitch('dark')}
              >
                <Moon size={16} />
                <span>Pure Black Dark</span>
              </button>
              <button 
                type="button" 
                className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => handleThemeModeSwitch('light')}
              >
                <Sun size={16} />
                <span>Soothing Light Mode</span>
              </button>
            </div>
          </div>

          {/* Color Presets Grid */}
          <div className="form-group">
            <label className="form-label">Curated Calm Presets (with Background Graphics)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {COLOR_PRESETS.map((p) => {
                const isActive = preset === p.id;
                return (
                  <div
                    key={p.name}
                    onClick={() => applyPresetColors(p.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.625rem 0.85rem',
                      borderRadius: '10px',
                      backgroundColor: isActive ? 'var(--accent-light)' : 'var(--bg-input)',
                      border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${p.primary}, ${p.secondary})`,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      flexShrink: 0
                    }} />
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{p.name}</span>
                      <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{p.description}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Theme Pickers */}
          <div className="form-group" style={{ borderTop: '1px dashed var(--border)', paddingTop: '1.25rem' }}>
            <label className="form-label" style={{ marginBottom: '0.5rem' }}>Manual Color Tuning</label>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Primary Color Picker */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Primary Accent</span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Auto-generates secondary and base</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input 
                    type="color" 
                    value={customPrimary}
                    onChange={(e) => handlePrimaryChange(e.target.value)}
                    style={{
                      border: 'none',
                      padding: 0,
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      backgroundColor: 'transparent'
                    }}
                  />
                  <input 
                    type="text" 
                    className="form-input" 
                    style={{ width: '90px', padding: '0.375rem 0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textAlign: 'center' }} 
                    value={customPrimary}
                    onChange={(e) => handlePrimaryChange(e.target.value)}
                  />
                </div>
              </div>

              {/* Secondary Color Picker */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Secondary Accent (Hover)</span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Applied to interactive states</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input 
                    type="color" 
                    value={customSecondary}
                    onChange={(e) => handleSecondaryChange(e.target.value)}
                    style={{
                      border: 'none',
                      padding: 0,
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      backgroundColor: 'transparent'
                    }}
                  />
                  <input 
                    type="text" 
                    className="form-input" 
                    style={{ width: '90px', padding: '0.375rem 0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textAlign: 'center' }} 
                    value={customSecondary}
                    onChange={(e) => handleSecondaryChange(e.target.value)}
                  />
                </div>
              </div>

              {/* Custom App Background Picker */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>App Background Color</span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Custom base canvas color</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input 
                    type="color" 
                    value={customBg}
                    onChange={(e) => handleBgChange(e.target.value)}
                    style={{
                      border: 'none',
                      padding: 0,
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      backgroundColor: 'transparent'
                    }}
                  />
                  <input 
                    type="text" 
                    className="form-input" 
                    style={{ width: '90px', padding: '0.375rem 0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textAlign: 'center' }} 
                    value={customBg}
                    onChange={(e) => handleBgChange(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="form-actions" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--border)' }}>
          <button type="button" className="btn btn-secondary" onClick={handleReset}>
            <RefreshCw size={14} />
            <span>Reset Defaults</span>
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};
