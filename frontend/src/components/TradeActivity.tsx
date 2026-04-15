import React from 'react';
import type { Trade } from '../types';

interface Props { trades: Trade[]; }

function fmtTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function fmtPnl(n: number) {
  return (n >= 0 ? '+$' : '-$') + Math.abs(n).toFixed(2);
}

const TradeActivity: React.FC<Props> = ({ trades }) => {
  const recent = trades.slice(0, 12);

  return (
    <div className="feed-panel">
      <div className="section-hdr" style={{ marginBottom: 8 }}>
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
          <div key={trade.id} className="feed-row">
            <span className="fd"
              style={{
                background: trade.agentColor || 'var(--text-dim)',
                boxShadow: `0 0 4px ${trade.agentColor || 'var(--text-dim)'}`,
              }}
            />
            <span className="ft">{fmtTime(trade.closedAt || trade.openedAt)}</span>
            <span className="fn" style={{ color: trade.agentColor || 'var(--text)' }}>
              {trade.agentCodename}
            </span>
            <span className="fs">{trade.symbol}</span>
            <span className={`fdir ${trade.direction}`}>
              {trade.direction === 'long' ? 'LONG' : 'SHRT'}
            </span>
            <span className="fpnl" style={{ color: trade.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {fmtPnl(trade.pnl)}
            </span>
          </div>
        ))
      )}
    </div>
  );
};

export default TradeActivity;
