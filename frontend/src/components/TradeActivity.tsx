import React from 'react';
import type { Trade } from '../types';

interface TradeActivityProps {
  trades: Trade[];
}

function fmtTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function fmtPnl(n: number) {
  const sign = n >= 0 ? '+' : '';
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

const TradeActivity: React.FC<TradeActivityProps> = ({ trades }) => {
  const recent = trades.slice(0, 12);

  return (
    <div className="activity-feed">
      <div className="section-header" style={{ marginBottom: 8 }}>
        <span className="section-title">RECENT INTEL</span>
        <span style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1 }}>
          {trades.length} OPS
        </span>
      </div>

      {recent.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 10, letterSpacing: 2 }}>
          AWAITING FIELD REPORTS...
        </div>
      ) : (
        recent.map(trade => (
          <div key={trade.id} className="activity-item">
            <span
              className="activity-dot"
              style={{
                background: trade.agentColor || 'var(--text-secondary)',
                boxShadow: `0 0 4px ${trade.agentColor || 'var(--text-secondary)'}`
              }}
            />
            <span className="activity-time">{fmtTime(trade.closedAt || trade.openedAt)}</span>
            <span
              className="activity-codename"
              style={{ color: trade.agentColor || 'var(--text-secondary)' }}
            >
              {trade.agentCodename}
            </span>
            <span className="activity-symbol">{trade.symbol}</span>
            <span className={`activity-dir ${trade.direction}`}>
              {trade.direction === 'long' ? 'LONG' : 'SHRT'}
            </span>
            <span
              className="activity-pnl"
              style={{ color: trade.pnl >= 0 ? 'var(--text-primary)' : 'var(--accent-red)' }}
            >
              {fmtPnl(trade.pnl)}
            </span>
          </div>
        ))
      )}
    </div>
  );
};

export default TradeActivity;
