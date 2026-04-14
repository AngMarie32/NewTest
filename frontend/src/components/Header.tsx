import React from 'react';
import type { VaultData } from '../types';

interface HeaderProps {
  vault: VaultData | null;
  connected: boolean;
  onOpenSettings: () => void;
}

function fmt(n: number) {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return '$' + (n / 1_000).toFixed(1) + 'K';
  return '$' + n.toFixed(2);
}

const Header: React.FC<HeaderProps> = ({ vault, connected, onOpenSettings }) => {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();

  return (
    <div className="header">
      {/* Logo */}
      <div className="header-logo">
        <span className="header-title">FREE AGENT TRADER VAULT</span>
        <span className="header-subtitle">CLASSIFIED OPERATIONS CENTER // SECURE CHANNEL</span>
      </div>

      {/* Center stats */}
      {vault && (
        <div className="header-stats">
          <div className="header-stat">
            <span className="header-stat-label">FIELD AGENTS</span>
            <span className="header-stat-value">
              <span style={{ color: 'var(--text-primary)' }}>{vault.activeAgents}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>/{vault.totalAgents}</span>
            </span>
          </div>
          <div className="header-stat">
            <span className="header-stat-label">VAULT ASSETS</span>
            <span className="header-stat-value gold">{fmt(vault.totalBalance)}</span>
          </div>
          <div className="header-stat">
            <span className="header-stat-label">DAY OPS P&L</span>
            <span className={`header-stat-value ${vault.dailyPnl >= 0 ? 'green' : 'red'}`}>
              {vault.dailyPnl >= 0 ? '+' : ''}{fmt(vault.dailyPnl)}
            </span>
          </div>
          <div className="header-stat">
            <span className="header-stat-label">TOTAL ROI</span>
            <span className={`header-stat-value ${vault.roi >= 0 ? 'green' : 'red'}`}>
              {vault.roi >= 0 ? '+' : ''}{vault.roi.toFixed(2)}%
            </span>
          </div>
        </div>
      )}

      {/* Right panel */}
      <div className="header-right">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--text-primary)' }}>
            {timeStr}
          </span>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2 }}>{dateStr}</span>
        </div>

        <div className="ws-indicator">
          <div className={`ws-dot ${connected ? 'connected' : ''}`} />
          <span>{connected ? 'LIVE' : 'OFFLINE'}</span>
        </div>

        <button className="btn-settings" onClick={onOpenSettings}>
          ⚙ SETTINGS
        </button>
      </div>
    </div>
  );
};

export default Header;
