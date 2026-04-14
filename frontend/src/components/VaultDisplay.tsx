import React, { useEffect, useRef, useState } from 'react';
import type { VaultData } from '../types';

interface Props { vault: VaultData | null; }

function useCountUp(target: number, ms = 900) {
  const [val, setVal] = useState(target);
  const prev = useRef(target);
  const raf  = useRef(0);
  useEffect(() => {
    const from = prev.current;
    const diff = target - from;
    if (Math.abs(diff) < 0.01) return;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / ms, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(from + diff * e);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else prev.current = target;
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, ms]);
  return val;
}

const fmtShort = (n: number) => {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000)     return '$' + (n / 1_000).toFixed(1) + 'K';
  return '$' + n.toFixed(2);
};
const fmtFull = (n: number) =>
  (n >= 0 ? '+$' : '-$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2 });

const R = 58;
const CIRC = 2 * Math.PI * R;

// Decorative bolt positions around the vault ring
const BOLTS = [0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
  const r = deg * Math.PI / 180;
  return { x: 80 + 72 * Math.cos(r), y: 80 + 72 * Math.sin(r) };
});

const VaultDisplay: React.FC<Props> = ({ vault }) => {
  const animBal  = useCountUp(vault?.totalBalance ?? 0);
  const animDaily = useCountUp(vault?.dailyPnl ?? 0);

  if (!vault) return (
    <div className="vault-panel" style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: 10, letterSpacing: 3 }}>
      CONNECTING TO VAULT...
    </div>
  );

  const pct    = Math.min(Math.max((vault.roi / 25) * 100, 0), 100);
  const offset = CIRC - (pct / 100) * CIRC;
  const isPos  = vault.totalPnl >= 0;
  const isDPos = vault.dailyPnl >= 0;

  return (
    <div className="vault-panel">
      <div className="vault-title">THE VAULT</div>

      {/* Vault door */}
      <div className="vault-door-container">
        <svg
          className="vault-door-svg"
          width={160} height={160}
          viewBox="0 0 160 160"
        >
          {/* Outer decorative border */}
          <rect x="4" y="4" width="152" height="152" rx="4"
            fill="none" stroke="rgba(255,215,0,0.12)" strokeWidth="1" />

          {/* Bolt holes */}
          {BOLTS.map((b, i) => (
            <circle key={i} cx={b.x} cy={b.y} r="3"
              fill="none" stroke="rgba(255,215,0,0.3)" strokeWidth="1" />
          ))}

          {/* Ring track */}
          <circle className="vault-door-track" cx="80" cy="80" r={R}
            transform="rotate(-90 80 80)" />

          {/* Ring fill */}
          <circle
            className="vault-door-ring"
            cx="80" cy="80" r={R}
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            stroke={isPos ? 'var(--gold)' : 'var(--red)'}
            transform="rotate(-90 80 80)"
          />

          {/* Inner rings */}
          <circle cx="80" cy="80" r="46" fill="none" stroke="rgba(255,215,0,0.08)" strokeWidth="1" />
          <circle cx="80" cy="80" r="34" fill="#060c14" stroke="rgba(255,215,0,0.15)" strokeWidth="1" />

          {/* Spinning combination dial */}
          <g style={{ transformOrigin: '80px 80px', animation: 'vault-spin 12s linear infinite' }}>
            <circle cx="80" cy="80" r="22" fill="#0a1220" stroke="var(--gold-dim)" strokeWidth="1.5" />
            {[0, 60, 120, 180, 240, 300].map((deg, i) => {
              const r = deg * Math.PI / 180;
              const x1 = 80 + 17 * Math.cos(r); const y1 = 80 + 17 * Math.sin(r);
              const x2 = 80 + 21 * Math.cos(r); const y2 = 80 + 21 * Math.sin(r);
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--gold)" strokeWidth="1" />;
            })}
            <line x1="80" y1="80" x2="80" y2="62" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" />
          </g>

          {/* Center pip */}
          <circle cx="80" cy="80" r="5" fill="var(--gold)" opacity="0.5" />
        </svg>

        {/* Center text overlay */}
        <div className="vault-center-content">
          <span className="vault-label">ASSETS</span>
          <span className="vault-amount">{fmtShort(animBal)}</span>
          <span className="vault-roi" style={{ color: isPos ? 'var(--green)' : 'var(--red)' }}>
            {isPos ? '+' : ''}{vault.roi.toFixed(2)}% ROI
          </span>
        </div>
      </div>

      <div className="vault-incoming">▼ PROFIT STREAMS INCOMING ▼</div>

      <div className="vault-stats">
        <div className="vault-stat">
          <div className="vault-stat-label">TODAY</div>
          <div className="vault-stat-value" style={{ color: isDPos ? 'var(--green)' : 'var(--red)' }}>
            {fmtFull(animDaily)}
          </div>
        </div>
        <div className="vault-stat">
          <div className="vault-stat-label">WEEKLY</div>
          <div className="vault-stat-value" style={{ color: vault.weeklyPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {fmtFull(vault.weeklyPnl)}
          </div>
        </div>
        <div className="vault-stat">
          <div className="vault-stat-label">ALLOCATED</div>
          <div className="vault-stat-value" style={{ color: 'var(--gold)' }}>
            ${vault.totalAllocated.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
        </div>
        <div className="vault-stat">
          <div className="vault-stat-label">AGENTS</div>
          <div className="vault-stat-value" style={{ color: 'var(--teal)' }}>
            {vault.activeAgents}/{vault.totalAgents}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VaultDisplay;
