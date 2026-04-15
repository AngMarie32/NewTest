import React from 'react';
import type { Agent } from '../types';

interface Props { agents: Agent[]; }

const fmtPnl = (n: number) =>
  (n >= 0 ? '+$' : '-$') + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 });

const ProfitsPipeline: React.FC<Props> = ({ agents }) => {
  const sorted = [...agents].sort((a, b) => b.totalPnl - a.totalPnl);
  const maxAbs = Math.max(...agents.map(a => Math.abs(a.totalPnl)), 1);

  return (
    <div className="pipeline-panel">
      <div className="section-hdr" style={{ marginBottom: 12 }}>
        <span className="section-title">PROFIT PIPELINE</span>
        <span style={{ fontSize: 10, color: 'var(--teal)', fontFamily: 'var(--font-hud)' }}>
          {fmtPnl(agents.reduce((s, a) => s + a.totalPnl, 0))}
        </span>
      </div>

      {sorted.map(agent => {
        const pct   = (Math.abs(agent.totalPnl) / maxAbs) * 100;
        const isPos = agent.totalPnl >= 0;
        const color = isPos ? agent.agentColor : 'var(--red)';

        return (
          <div key={agent.id} className="pipeline-row">
            <div className="pipe-hdr">
              <div className="pipe-name">
                <span className="pipe-dot"
                  style={{ background: agent.agentColor, boxShadow: `0 0 4px ${agent.agentColor}` }} />
                {agent.codename}
              </div>
              <span className="pipe-pnl" style={{ color }}>
                {fmtPnl(agent.totalPnl)}
              </span>
            </div>
            <div className="pipe-track">
              <div className="pipe-fill" style={{
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${color}30, ${color})`,
                boxShadow: `0 0 4px ${color}50`,
              }} />
            </div>
            <div className="pipe-meta">
              {agent.todayTrades} ops today &nbsp;·&nbsp; {(agent.winRate * 100).toFixed(0)}% WIN &nbsp;·&nbsp;
              <span style={{ color: agent.status === 'executing' ? 'var(--gold)' : agent.status === 'active' ? 'var(--green)' : 'var(--text-dim)' }}>
                {agent.status.toUpperCase()}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProfitsPipeline;
