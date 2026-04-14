import React from 'react';
import type { Agent } from '../types';

interface ProfitsPipelineProps {
  agents: Agent[];
}

function fmt(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1000) return (n >= 0 ? '+$' : '-$') + (abs / 1000).toFixed(1) + 'K';
  return (n >= 0 ? '+$' : '-$') + abs.toFixed(2);
}

const ProfitsPipeline: React.FC<ProfitsPipelineProps> = ({ agents }) => {
  if (!agents.length) return null;

  // Sort by total PnL descending
  const sorted = [...agents].sort((a, b) => b.totalPnl - a.totalPnl);

  // Find max absolute PnL for scaling
  const maxAbs = Math.max(...agents.map(a => Math.abs(a.totalPnl)), 1);

  return (
    <div className="pipeline-panel">
      <div className="section-header" style={{ marginBottom: 12 }}>
        <span className="section-title">PROFITS PIPELINE</span>
        <span style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1 }}>
          TOTAL FLOW
        </span>
      </div>

      {sorted.map(agent => {
        const pct = (Math.abs(agent.totalPnl) / maxAbs) * 100;
        const isPos = agent.totalPnl >= 0;
        const barColor = isPos ? agent.agentColor : 'var(--accent-red)';

        return (
          <div key={agent.id} className="pipeline-item">
            <div className="pipeline-item-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: agent.agentColor,
                  boxShadow: `0 0 4px ${agent.agentColor}`,
                  display: 'inline-block',
                  flexShrink: 0
                }} />
                <span className="pipeline-codename">{agent.codename}</span>
              </div>
              <span className="pipeline-pnl" style={{ color: isPos ? agent.agentColor : 'var(--accent-red)' }}>
                {fmt(agent.totalPnl)}
              </span>
            </div>

            <div className="pipeline-bar-track">
              <div
                className="pipeline-bar-fill"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${barColor}40, ${barColor})`,
                  boxShadow: `0 0 4px ${barColor}60`,
                  animation: 'bar-fill 1s ease'
                }}
              />
            </div>

            <div className="pipeline-trades">
              {agent.todayTrades} trades today
              <span style={{ marginLeft: 8, color: 'var(--text-dim)' }}>
                {(agent.winRate * 100).toFixed(0)}% WIN
              </span>
              <span style={{ marginLeft: 8 }}>
                {agent.status === 'executing' ? (
                  <span style={{ color: 'var(--accent-gold)' }}>● EXECUTING</span>
                ) : agent.status === 'active' ? (
                  <span style={{ color: 'var(--text-secondary)' }}>● ON DUTY</span>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>◯ STANDBY</span>
                )}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProfitsPipeline;
