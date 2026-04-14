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
  forex:   'Momentum Scalper',
  stocks:  'Mean Reversion',
  crypto:  'Breakout Hunter',
  futures: 'Trend Follower',
};

/** Pixel-art spy character as inline SVG */
const SpyFigure: React.FC<{ color: string }> = ({ color }) => (
  <svg
    width="22" height="34"
    viewBox="0 0 11 17"
    style={{ imageRendering: 'pixelated', overflow: 'visible' }}
  >
    {/* hat brim */}
    <rect x="1" y="1" width="9" height="1" fill="#1a1a2e" />
    {/* hat top */}
    <rect x="2" y="0" width="7" height="2" fill="#1a1a2e" />
    {/* head */}
    <rect x="3" y="2" width="5" height="4" fill={color} />
    {/* eyes */}
    <rect x="4" y="3" width="1" height="1" fill="#000" />
    <rect x="6" y="3" width="1" height="1" fill="#000" />
    {/* body */}
    <rect x="2" y="6" width="7" height="5" fill="#1a2a4a" />
    {/* tie */}
    <rect x="4" y="6" width="3" height="4" fill="#ffd700" />
    {/* left arm */}
    <rect x="0" y="6" width="2" height="4" fill="#1a2a4a" />
    {/* right arm */}
    <rect x="9" y="6" width="2" height="4" fill="#1a2a4a" />
    {/* left leg */}
    <rect x="2" y="11" width="3" height="5" fill="#111" />
    {/* right leg */}
    <rect x="6" y="11" width="3" height="5" fill="#111" />
    {/* left shoe */}
    <rect x="1" y="15" width="4" height="2" fill="#333" />
    {/* right shoe */}
    <rect x="6" y="15" width="4" height="2" fill="#333" />
  </svg>
);

/** Bar chart heights that subtly animate */
const BAR_HEIGHTS = [45, 70, 35, 80, 55, 65];

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

  const pnlPos  = agent.dailyPnl  >= 0;
  const totalPos = agent.totalPnl >= 0;

  return (
    <div className={`agent-card${agent.status === 'executing' ? ' executing' : ''}${flashing ? ' flash' : ''}`}>
      {/* Header */}
      <div className="card-hdr">
        <div className="card-agent-name">
          <span className={`status-dot ${agent.status}`} />
          <span style={{ color: agent.agentColor, textShadow: `0 0 6px ${agent.agentColor}60` }}>
            AGENT {agent.codename}
          </span>
        </div>
        <span className={`card-status-badge ${agent.status}`}>
          {agent.status === 'executing' ? 'EXEC' :
           agent.status === 'active'    ? 'ACTIVE' :
           agent.status === 'standby'   ? 'IDLE' : 'OFFLINE'}
        </span>
      </div>

      {/* Room */}
      <div className="room">
        {/* Chart screen */}
        <div className="room-screen">
          <span className="screen-label">CHARTS</span>
          {BAR_HEIGHTS.map((h, i) => (
            <div
              key={i}
              className="screen-bar"
              style={{
                height: `${Math.max(15, h + (agent.dailyPnl > 0 ? 10 : -5))}%`,
                opacity: agent.status === 'offline' ? 0.2 : 1
              }}
            />
          ))}
        </div>

        {/* Animated spy character */}
        <div
          className="spy-agent"
          style={{
            color: agent.agentColor,
            animationPlayState: agent.status === 'offline' ? 'paused' : 'running',
            animationDuration: agent.status === 'executing' ? '3s' : '7s'
          }}
        >
          <SpyFigure color={agent.agentColor} />
        </div>

        {/* Mini vault */}
        <div className="room-vault">
          <div className="mini-vault-door">
            <div className="mini-vault-dial" />
            <div className="mini-vault-handle" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="card-footer">
        <div className="card-stats">
          <div>
            <div className="card-stat-label">MISSION P/L</div>
            <div className={`card-stat-value ${pnlPos ? 'pos' : 'neg'}`}>{fmt(agent.dailyPnl)}</div>
          </div>
          <div>
            <div className="card-stat-label">OPS TODAY</div>
            <div className="card-stat-value teal">{agent.todayTrades}</div>
          </div>
          <div>
            <div className="card-stat-label">WIN RATE</div>
            <div className="card-stat-value gold">{(agent.winRate * 100).toFixed(1)}%</div>
          </div>
          <div>
            <div className="card-stat-label">TOTAL P/L</div>
            <div className={`card-stat-value ${totalPos ? 'pos' : 'neg'}`}>{fmt(agent.totalPnl)}</div>
          </div>
        </div>

        <div className="card-strategy">
          STRATEGY: {STRATEGIES[agent.preferredMarket] || 'Algorithmic'} &nbsp;·&nbsp;
          {agent.currentSymbol ? agent.currentSymbol : 'SCANNING...'}
        </div>

        <div className="card-actions">
          <span className="card-balance">{fmtBal(agent.currentBalance)}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-to-vault" onClick={() => onSettings(agent.id)}>
              → TO VAULT
            </button>
            <button className="btn-cfg" onClick={() => onSettings(agent.id)}>
              CFG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentCard;
