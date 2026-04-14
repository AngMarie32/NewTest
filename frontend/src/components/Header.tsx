import React, { useState, useEffect } from 'react';
import type { VaultData } from '../types';

interface Props {
  vault: VaultData | null;
  connected: boolean;
  onOpenSettings: () => void;
}

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
      <div>
        <div className="header-title">FREE AGENT TRADER VAULT</div>
        <div className="header-sub">AUTONOMOUS TRADING OPERATIONS CENTER</div>
      </div>

      <div className="live-dot">
        <span className={connected ? 'on' : ''} />
        {connected ? 'SYSTEM ONLINE' : 'OFFLINE'}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span className="header-time">{time}</span>
        <button className="btn-settings" onClick={onOpenSettings}>⚙ SETTINGS</button>
      </div>
    </div>
  );
};

export default Header;
