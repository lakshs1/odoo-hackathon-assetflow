import React from 'react';
import { useApp } from '../context/AppContext';

interface AssetParticle {
  id: number;
  type: 'laptop' | 'vehicle' | 'chair' | 'machine';
  tag: string;
}

const DEFAULT_ASSETS: AssetParticle[] = [
  { id: 1, type: 'vehicle', tag: 'AST-VEH-04' },
  { id: 2, type: 'laptop', tag: 'AST-LAP-92' },
  { id: 3, type: 'chair', tag: 'AST-FUR-11' },
  { id: 4, type: 'machine', tag: 'AST-SRV-55' },
  { id: 5, type: 'vehicle', tag: 'AST-CAR-18' },
  { id: 6, type: 'laptop', tag: 'AST-MAC-83' },
  { id: 7, type: 'chair', tag: 'AST-DESK-09' },
  { id: 8, type: 'machine', tag: 'AST-PRN-27' },
  { id: 9, type: 'vehicle', tag: 'AST-TRK-74' },
  { id: 10, type: 'laptop', tag: 'AST-DEV-01' },
  { id: 11, type: 'chair', tag: 'AST-SFA-15' },
  { id: 12, type: 'machine', tag: 'AST-CNC-99' },
  { id: 13, type: 'vehicle', tag: 'AST-SUV-33' },
  { id: 14, type: 'laptop', tag: 'AST-PAD-50' },
  { id: 15, type: 'chair', tag: 'AST-TBL-66' },
  { id: 16, type: 'machine', tag: 'AST-RTR-12' },
];

const SECTOR_COORDS = [
  { left: '4%', top: '8%' },
  { left: '26%', top: '15%' },
  { left: '48%', top: '5%' },
  { left: '72%', top: '12%' },
  { left: '90%', top: '6%' },
  { left: '10%', top: '38%' },
  { left: '36%', top: '48%' },
  { left: '60%', top: '32%' },
  { left: '82%', top: '42%' },
  { left: '6%', top: '74%' },
  { left: '28%', top: '82%' },
  { left: '52%', top: '68%' },
  { left: '74%', top: '85%' },
  { left: '92%', top: '72%' },
];

export const ThemeBackgroundGraphics: React.FC = () => {
  const { preset } = useApp();

  // Sakura Preset: Render falling cherry blossom petals
  if (preset === 'sakura') {
    const items = Array.from({ length: 18 });
    return (
      <div className="theme-graphics-container sakura-graphics">
        {items.map((_, index) => {
          const left = `${(index * 7.5 + ((index * 11) % 5)) % 100}%`;
          const delay = `${((index * 3) % 12)}s`;
          const duration = `${12 + ((index * 5) % 16)}s`;
          const scale = 0.4 + ((index * 2) % 7) * 0.1;
          const opacity = 0.12 + ((index * 4) % 28) * 0.01;

          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                left,
                top: '-50px',
                opacity,
                transform: `scale(${scale})`,
                pointerEvents: 'none',
                zIndex: 0
              }}
            >
              <div
                className="graphics-particle"
                style={{
                  animationDelay: delay,
                  animationDuration: duration,
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C11.5 6 8 9 5 12C2 15 3.5 19 7 21C11 23 13 20 15 17C17 14 18 10 20 7C22 4 21 2 19 2C16 2 13.5 4.5 12 2Z" />
                </svg>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Odoo Preset: Handled directly in App background styles, return null here
  if (preset === 'odoo') {
    return null;
  }

  // Default Theme Graphics: 2D Tracked Assets Blueprint outlines (Top view)
  return (
    <div className="theme-graphics-container default-graphics">
      {DEFAULT_ASSETS.slice(0, SECTOR_COORDS.length).map((asset, index) => {
        const coords = SECTOR_COORDS[index];
        const delay = `-${((index * 17) % 45)}s`;
        const duration = `${45 + ((index * 9) % 30)}s`;
        const scale = 1.0 + ((index * 3) % 4) * 0.1;

        return (
          <div
            key={asset.id}
            style={{
              position: 'absolute',
              left: coords.left,
              top: coords.top,
              transform: `scale(${scale})`,
              pointerEvents: 'none',
              zIndex: 0
            }}
          >
            <div
              className="asset-particle"
              style={{
                animationDelay: delay,
                animationDuration: duration,
              }}
            >
              {/* Top view outlines of tracked assets (56px baseline dimensions) */}
              {asset.type === 'vehicle' && (
                <svg width="56" height="56" viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ transform: 'rotate(90deg)' }}>
                  <rect x="20" y="8" width="20" height="44" rx="6" />
                  <path d="M22 20 h16 M22 42 h16" />
                  <path d="M17 21 h3 M40 21 h3" />
                  <circle cx="25" cy="11" r="1.5" fill="currentColor" />
                  <circle cx="35" cy="11" r="1.5" fill="currentColor" />
                </svg>
              )}
              {asset.type === 'laptop' && (
                <svg width="56" height="56" viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <rect x="15" y="10" width="30" height="20" rx="2" />
                  <rect x="18" y="12" width="24" height="15" rx="1" />
                  <path d="M10 30 h40 v8 a4 4 0 0 1 -4 4 h-32 a4 4 0 0 1 -4 -4 Z" />
                  <rect x="25" y="36" width="10" height="4" rx="0.5" />
                </svg>
              )}
              {asset.type === 'chair' && (
                <svg width="56" height="56" viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <circle cx="30" cy="30" r="12" />
                  <path d="M20 18 C 24 14, 36 14, 40 18" />
                  <path d="M15 24 c 0 4, 1 8, 1 8 M45 24 c 0 4, -1 8, -1 8" />
                  <path d="M30 30 l -8 -8 M30 30 l 8 -8 M30 30 l -8 8 M30 30 l 8 8" strokeOpacity="0.4" />
                </svg>
              )}
              {asset.type === 'machine' && (
                <svg width="56" height="56" viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <rect x="15" y="15" width="30" height="30" rx="3" />
                  <line x1="18" y1="22" x2="42" y2="22" />
                  <line x1="18" y1="28" x2="42" y2="28" />
                  <line x1="18" y1="34" x2="42" y2="34" />
                  <line x1="18" y1="40" x2="42" y2="40" strokeDasharray="2 2" />
                  <circle cx="21" cy="22" r="1" fill="currentColor" />
                  <circle cx="21" cy="28" r="1" fill="currentColor" />
                </svg>
              )}

              {/* Heartbeat pulse serial tag */}
              <div className="asset-floating-tag">
                <span className="floating-pulse-dot" />
                <span>{asset.tag}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
