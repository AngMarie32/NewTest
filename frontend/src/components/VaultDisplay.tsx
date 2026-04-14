import React, { useEffect, useRef, useState } from 'react';
import type { VaultData } from '../types';

interface VaultDisplayProps {
  vault: VaultData | null;
}

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(target);
  const prevRef = useRef(target);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = prevRef.current;
    const diff = target - start;
    if (Math.abs(diff) < 0.01) return;

    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease out cubic
      setValue(start + diff * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
      else prevRef.current = target;
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

function fmt(n: number) {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return '$' + (n / 1_000).toFixed(1) + 'K';
  return '$' + n.toFixed(2);
}

function fmtFull(n: number) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

const CIRCUMFERENCE = 2 * Math.PI * 52; // r=52

const VaultDisplay: React.FC<VaultDisplayProps> = ({ vault }) => {
  const animatedBalance = useCountUp(vault?.totalBalance ?? 0);
  const animatedPnl = useCountUp(vault?.dailyPnl ?? 0);

  if (!vault) {
    return (
      <div className="vault-panel">
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          CONNECTING TO VAULT...
        </div>
      </div>
    );
  }

  // ROI as 0-100 pct for ring fill
  const pct = Math.min(Math.max((vault.roi / 30) * 100, 0), 100); // 30% ROI = full ring
  const dashOffset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE;
  const isPositive = vault.totalPnl >= 0;
  const isDailyPos = vault.dailyPnl >= 0;

  return (
    <div className="vault-panel">
      <div className="section-header" style={{ marginBottom: 8 }}>
        <span className="section-title">THE VAULT</span>
        <span style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2 }}>
          {vault.activeAgents}/{vault.totalAgents} ACTIVE
        </span>
      </div>

      {/* Ring gauge */}
      <div className="vault-ring-container">
        <svg className="vault-ring-svg" width={140} height={140} viewBox="0 0 120 120">
          {/* Outer decorative ring */}
          <circle cx="60" cy="60" r="56" fill="none" stroke="rgba(0,255,65,0.04)" strokeWidth="1" />
          <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(0,255,65,0.04)" strokeWidth="1" />

          {/* Track */}
          <circle
            className="vault-ring-track"
            cx="60" cy="60" r="52"
          />

          {/* Fill */}
          <circle
            className={`vault-ring-fill ${isPositive ? '' : 'red'}`}
            cx="60" cy="60" r="52"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{ stroke: isPositive ? 'var(--text-primary)' : 'var(--accent-red)' }}
          />

          {/* Tick marks */}
          {[0, 90, 180, 270].map(angle => {
            const rad = (angle * Math.PI) / 180;
            const x1 = 60 + 47 * Math.cos(rad);
            const y1 = 60 + 47 * Math.sin(rad);
            const x2 = 60 + 43 * Math.cos(rad);
            const y2 = 60 + 43 * Math.sin(rad);
            return (
              <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="rgba(0,255,65,0.3)" strokeWidth="1.5" />
            );
          })}
        </svg>

        <div className="vault-center">
          <span className="vault-total-label">TOTAL ASSETS</span>
          <span className={`vault-total-amount ${vault.totalBalance > vault.totalAllocated ? 'gold' : ''}`}>
            {fmt(animatedBalance)}
          </span>
          <span className="vault-roi" style={{ color: isPositive ? 'var(--text-primary)' : 'var(--accent-red)' }}>
            {isPositive ? '+' : ''}{vault.roi.toFixed(2)}% ROI
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="vault-stats-grid">
        <div className="vault-stat">
          <div className="vault-stat-label">DAY P&L</div>
          <div className="vault-stat-value" style={{ color: isDailyPos ? 'var(--text-primary)' : 'var(--accent-red)' }}>
            {isDailyPos ? '+' : ''}${fmtFull(animatedPnl)}
          </div>
        </div>
        <div className="vault-stat">
          <div className="vault-stat-label">WEEKLY P&L</div>
          <div className="vault-stat-value" style={{ color: vault.weeklyPnl >= 0 ? 'var(--text-primary)' : 'var(--accent-red)' }}>
            {vault.weeklyPnl >= 0 ? '+' : ''}${fmtFull(vault.weeklyPnl)}
          </div>
        </div>
        <div className="vault-stat">
          <div className="vault-stat-label">ALLOCATED</div>
          <div className="vault-stat-value" style={{ color: 'var(--accent-gold)' }}>
            ${fmtFull(vault.totalAllocated)}
          </div>
        </div>
        <div className="vault-stat">
          <div className="vault-stat-label">TOTAL P&L</div>
          <div className="vault-stat-value" style={{ color: isPositive ? 'var(--text-primary)' : 'var(--accent-red)' }}>
            {isPositive ? '+' : ''}${fmtFull(vault.totalPnl)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VaultDisplay;
