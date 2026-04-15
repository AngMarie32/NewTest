import React, { useState, useEffect } from 'react';
import type { VaultData } from '../types';

interface Props {
  vault: VaultData | null;
  connected: boolean;
  onOpenSettings: () => void;
}

const fmtShort = (n: number) => {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000)     return '$' + (n / 1_000).toFixed(1) + 'K';
  return '$' + n.toFixed(2);
};

const Header: React.FC<Props> = ({ vault, connected, onOpenSettings }) => {
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="header">
      <div className="header-brand">
        <div className="header-title">FREE AGENT TRADER VAULT</div>
        <div className="header-sub">AUTONOMOUS TRADING OPERATIONS CENTER</div>
      </div>

      {vault && (
        <div className="header-center">
          <div className="hc-item">
            <span className="hc-label">VAULT BALANCE</span>
            <span className="hc-value gold">{fmtShort(vault.totalBalance)}</span>
          </div>
          <div className="hc-item">
            <span className="hc-label">TODAY P/L</span>
            <span
              className="hc-value"
              style={{ color: vault.dailyPnl >= 0 ? 'var(--green)' : 'var(--red)' }}
            >
              {vault.dailyPnl >= 0 ? '+' : ''}{fmtShort(vault.dailyPnl)}
            </span>
          </div>
          <div className="hc-item">
            <span className="hc-label">TOTAL ROI</span>
            <span
              className="hc-value"
              style={{ color: vault.roi >= 0 ? 'var(--green)' : 'var(--red)' }}
            >
              {vault.roi >= 0 ? '+' : ''}{vault.roi.toFixed(2)}%
            </span>
          </div>
        </div>
      )}

      <div className="header-right">
        <div className="live-badge">
          <span className={`dot${connected ? ' on' : ''}`} />
          {connected ? 'SYSTEM ONLINE' : 'OFFLINE'}
        </div>
        <span className="hud-time">{time}</span>
        <button className="btn-settings" onClick={onOpenSettings}>⚙ SETTINGS</button>
      </div>
    </div>
  );
};

export default Header;
