import React, { useEffect, useRef, useState } from 'react';
import type { Agent } from '../types';

interface Props {
  agent: Agent;
  onSettings: (id: number) => void;
  isFlashing?: boolean;
}

const fmt = (n: number) =>
  (n >= 0 ? '+$' : '-$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtBal = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STRATEGIES: Record<string, string> = {
  forex:   'SCALPER',
  stocks:  'MEAN-REV',
  crypto:  'BREAKOUT',
  futures: 'TREND',
};

const SpyFigure: React.FC<{ color: string }> = ({ color }) => (
  <svg width="22" height="34" viewBox="0 0 11 17"
    style={{ imageRendering: 'pixelated', overflow: 'visible' }}>
    <rect x="1" y="1" width="9" height="1" fill="#1a1a2e" />
    <rect x="2" y="0" width="7" height="2" fill="#1a1a2e" />
    <rect x="3" y="2" width="5" height="4" fill={color} />
    <rect x="4" y="3" width="1" height="1" fill="#000" />
    <rect x="6" y="3" width="1" height="1" fill="#000" />
    <rect x="2" y="6" width="7" height="5" fill="#1a2a4a" />
    <rect x="4" y="6" width="3" height="4" fill="#ffc234" />
    <rect x="0" y="6" width="2" height="4" fill="#1a2a4a" />
    <rect x="9" y="6" width="2" height="4" fill="#1a2a4a" />
    <rect x="2" y="11" width="3" height="5" fill="#111" />
    <rect x="6" y="11" width="3" height="5" fill="#111" />
    <rect x="1" y="15" width="4" height="2" fill="#333" />
    <rect x="6" y="15" width="4" height="2" fill="#333" />
  </svg>
);

function makeCandleData(prices: number[]) {
  const pts = prices.slice(-8);
  if (pts.length < 2) return [];
  const lo = Math.min(...pts), hi = Math.max(...pts), rng = hi - lo || 1;
  return pts.slice(0, -1).map((o, i) => {
    const c = pts[i + 1];
    const dir = c >= o ? 'up' : 'dn';
    const bodyH = Math.max(3, (Math.abs(c - o) / rng) * 28);
    const topH  = ((Math.max(o, c) - lo) / rng) * 32 + 5;
    const wickH = Math.max(2, topH - bodyH);
    return { dir, bodyH, wickH };
  });
}

const AgentCard: React.FC<Props> = ({ agent, onSettings, isFlashing }) => {
  const [flashing, setFlashing] = useState(false);
  const prevFlash = useRef(false);

  useEffect(() => {
    if (isFlashing && !prevFlash.current) {
      setFlashing(true);
      setTimeout(() => setFlashing(false), 750);
    }
    prevFlash.current = isFlashing ?? false;
  }, [isFlashing]);

  const pnlPos  = agent.dailyPnl >= 0;
  const candles = makeCandleData(agent.chartData);

  const cardClass = [
    'agent-card',
    (agent.status === 'active' || agent.status === 'executing') ? 'active' : '',
    agent.status === 'executing' ? 'executing' : '',
    flashing ? 'flash' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClass}>
      {/* Header */}
      <div className="card-hdr">
        <div className="card-name">
          <span className={`status-dot ${agent.status}`} />
          <span style={{ color: agent.agentColor, textShadow: `0 0 6px ${agent.agentColor}60` }}>
            AGENT {agent.codename}
          </span>
        </div>
        <span className={`status-badge ${agent.status}`}>
          {agent.status === 'executing' ? 'EXEC' :
           agent.status === 'active'    ? 'ACTIVE' :
           agent.status === 'standby'   ? 'IDLE' : 'OFFLINE'}
        </span>
      </div>

      {/* Scene room */}
      <div className="scene">
        <div className="scene-floor" />

        {/* Monitor with candlestick chart */}
        <div className="monitor">
          <div className="monitor-body">
            <div className="candle-wrap">
              {candles.map((c, i) => (
                <div key={i} className={`candle ${c.dir}`}>
                  <div className="candle-wick" style={{ height: c.wickH }} />
                  <div className="candle-body" style={{ height: c.bodyH }} />
                </div>
              ))}
            </div>
          </div>
          <div className="monitor-stand" />
          <div className="monitor-base" />
        </div>

        {/* Desk surface */}
        <div className="desk" />

        {/* Wall vault */}
        <div className="wall-vault">
          <div className="vault-door-frame">
            <div className="vault-dial-outer" />
            <div className="vault-handle" />
          </div>
          <div className="vault-label-sm">VAULT</div>
        </div>

        {/* Spy character patrolling */}
        <div
          className="agent-sprite"
          style={{
            color: agent.agentColor,
            animationPlayState: agent.status === 'offline' ? 'paused' : 'running',
            animationDuration: agent.status === 'executing' ? '4s' : '8s',
          }}
        >
          <SpyFigure color={agent.agentColor} />
        </div>

        {agent.status === 'executing' && <div className="exec-scan" />}
      </div>

      {/* Footer */}
      <div className="card-footer">
        <div className="card-stats">
          <div>
            <div className="cs-label">MISSION P/L</div>
            <div className={`cs-value ${pnlPos ? 'pos' : 'neg'}`}>{fmt(agent.dailyPnl)}</div>
          </div>
          <div>
            <div className="cs-label">OPS TODAY</div>
            <div className="cs-value teal">{agent.todayTrades}</div>
          </div>
          <div>
            <div className="cs-label">WIN RATE</div>
            <div className="cs-value gold">{(agent.winRate * 100).toFixed(1)}%</div>
          </div>
        </div>

        <div className="card-row2">
          <span className="card-strategy">
            {STRATEGIES[agent.preferredMarket] || 'ALGO'}&nbsp;·&nbsp;
            {agent.currentSymbol || 'SCANNING...'}
          </span>
          <span className="card-balance">{fmtBal(agent.currentBalance)}</span>
        </div>

        <div className="card-row2" style={{ marginTop: 7 }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1 }}>
            TOTAL:&nbsp;
            <span style={{ color: agent.totalPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {fmt(agent.totalPnl)}
            </span>
          </span>
          <div className="card-btns">
            <button className="btn-vault" onClick={() => onSettings(agent.id)}>→ VAULT</button>
            <button className="btn-cfg"   onClick={() => onSettings(agent.id)}>CFG</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentCard;
