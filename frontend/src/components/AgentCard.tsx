import React, { useEffect, useRef, useState } from 'react';
import type { Agent } from '../types';
import MiniChart from './MiniChart';

interface AgentCardProps {
  agent: Agent;
  onSettings: (agentId: number) => void;
  isFlashing?: boolean;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function fmtPct(n: number) {
  return (n * 100).toFixed(1) + '%';
}

const MARKET_LABELS: Record<string, string> = {
  forex: 'FX',
  stocks: 'EQ',
  crypto: 'CRYPTO',
  futures: 'FUT'
};

const AgentCard: React.FC<AgentCardProps> = ({ agent, onSettings, isFlashing }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [justFlashed, setJustFlashed] = useState(false);

  useEffect(() => {
    if (isFlashing) {
      setJustFlashed(true);
      const t = setTimeout(() => setJustFlashed(false), 700);
      return () => clearTimeout(t);
    }
  }, [isFlashing]);

  const pnlColor = agent.dailyPnl >= 0 ? 'positive' : 'negative';
  const totalPnlColor = agent.totalPnl >= 0 ? 'positive' : 'negative';
  const pnlSign = agent.dailyPnl >= 0 ? '+' : '';
  const totalSign = agent.totalPnl >= 0 ? '+' : '';

  return (
    <div
      ref={cardRef}
      className={`agent-card status-${agent.status} ${justFlashed ? 'trade-flash' : ''}`}
      style={{ '--agent-color': agent.agentColor } as React.CSSProperties}
    >
      {/* Corner decorations */}
      <div className="agent-card-corner tl" style={{ borderColor: agent.agentColor + '80' }} />
      <div className="agent-card-corner tr" style={{ borderColor: agent.agentColor + '80' }} />
      <div className="agent-card-corner bl" style={{ borderColor: agent.agentColor + '80' }} />
      <div className="agent-card-corner br" style={{ borderColor: agent.agentColor + '80' }} />

      {/* Executing scan line */}
      {agent.status === 'executing' && <div className="executing-line" />}

      {/* Header */}
      <div className="agent-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            className="agent-codename"
            style={{ color: agent.agentColor, textShadow: `0 0 8px ${agent.agentColor}80` }}
          >
            {agent.codename}
          </span>
          <span
            style={{
              fontSize: 9,
              color: 'var(--text-muted)',
              letterSpacing: 1,
              paddingLeft: 6,
              borderLeft: `1px solid var(--border-dim)`
            }}
          >
            {MARKET_LABELS[agent.preferredMarket] || agent.preferredMarket}
          </span>
        </div>
        <span className={`agent-status-badge ${agent.status}`}>
          {agent.status === 'executing' ? '⬤ EXEC' :
           agent.status === 'active' ? '⬤ ACTIVE' :
           agent.status === 'standby' ? '◯ STANDBY' : '✕ OFFLINE'}
        </span>
      </div>

      {/* Body */}
      <div className="agent-card-body">
        {/* Metrics */}
        <div className="agent-metrics-row">
          <div className="agent-metric">
            <span className="agent-metric-label">DAY P&L</span>
            <span className={`agent-metric-value ${pnlColor}`}>
              {pnlSign}${fmt(agent.dailyPnl)}
            </span>
          </div>
          <div className="agent-metric">
            <span className="agent-metric-label">WIN RATE</span>
            <span className="agent-metric-value gold">
              {fmtPct(agent.winRate)}
            </span>
          </div>
          <div className="agent-metric">
            <span className="agent-metric-label">TRADES</span>
            <span className="agent-metric-value neutral">
              {agent.todayTrades}<span style={{ color: 'var(--text-muted)', fontSize: 10 }}>/{agent.totalTrades}</span>
            </span>
          </div>
        </div>

        {/* Chart */}
        <MiniChart
          data={agent.chartData}
          color={agent.agentColor}
          height={52}
        />

        {/* Symbol row */}
        <div className="agent-symbol-row" style={{ marginTop: 6 }}>
          <div className="agent-current-symbol">
            {agent.currentSymbol ? (
              <>
                <span style={{ color: 'var(--text-muted)' }}>MONITORING</span>
                <span style={{ color: 'var(--text-white)', letterSpacing: 1 }}>
                  {agent.currentSymbol}
                </span>
                {agent.currentDirection && (
                  <span className={`direction-badge ${agent.currentDirection}`}>
                    {agent.currentDirection.toUpperCase()}
                  </span>
                )}
              </>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>SCANNING MARKETS...</span>
            )}
          </div>
          <span className="agent-platform-badge">
            {agent.platform === 'ninjatrader' ? 'NT8' :
             agent.platform === 'tradingview' ? 'TV' : 'SIM'}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="agent-card-footer">
        <div className="agent-balance">
          <span className="agent-balance-label">VAULT BALANCE</span>
          <span
            className="agent-balance-value"
            style={{
              color: agent.agentColor,
              textShadow: `0 0 6px ${agent.agentColor}60`
            }}
          >
            ${fmt(agent.currentBalance)}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1 }}>TOTAL P&L</span>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 12,
            fontWeight: 700,
            color: agent.totalPnl >= 0 ? 'var(--text-primary)' : 'var(--accent-red)'
          }}>
            {totalSign}${fmt(agent.totalPnl)}
          </span>
        </div>
      </div>

      {/* Settings button */}
      <div style={{ padding: '6px 14px', borderTop: '1px solid var(--border-dim)' }}>
        <button
          className="btn-agent-settings"
          onClick={() => onSettings(agent.id)}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          ⚙ CONFIGURE AGENT
        </button>
      </div>
    </div>
  );
};

export default AgentCard;
