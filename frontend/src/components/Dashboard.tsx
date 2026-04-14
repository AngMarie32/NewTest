import React, { useState, useCallback } from 'react';
import type { Agent, Trade, VaultData, Connection, WSMessage } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';
import Header from './Header';
import AgentCard from './AgentCard';
import VaultDisplay from './VaultDisplay';
import ProfitsPipeline from './ProfitsPipeline';
import TradeActivity from './TradeActivity';
import SettingsModal from './SettingsModal';

const fmt2 = (n: number) =>
  (n >= 0 ? '+$' : '-$') + Math.abs(n).toFixed(2);

const Dashboard: React.FC = () => {
  const [agents,      setAgents]      = useState<Agent[]>([]);
  const [trades,      setTrades]      = useState<Trade[]>([]);
  const [vault,       setVault]       = useState<VaultData | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [flashing,    setFlashing]    = useState<Set<number>>(new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsAgent, setSettingsAgent] = useState<number | null>(null);

  const handleMessage = useCallback((msg: WSMessage) => {
    switch (msg.type) {
      case 'INIT':
        if (msg.data.agents)      setAgents(msg.data.agents);
        if (msg.data.vault)       setVault(msg.data.vault);
        if (msg.data.trades)      setTrades(msg.data.trades);
        if (msg.data.connections) setConnections(msg.data.connections);
        break;

      case 'AGENT_UPDATE':
        if (msg.data.agent) {
          setAgents(prev => {
            const i = prev.findIndex(a => a.id === msg.data.agent!.id);
            if (i >= 0) { const n = [...prev]; n[i] = msg.data.agent!; return n; }
            return [...prev, msg.data.agent!];
          });
        }
        break;

      case 'TRADE_EXECUTED':
        if (msg.data.trade) {
          const t = msg.data.trade;
          setTrades(prev => [t, ...prev].slice(0, 100));
          setFlashing(prev => { const n = new Set(prev); n.add(t.agentId); return n; });
          setTimeout(() => setFlashing(prev => { const n = new Set(prev); n.delete(t.agentId); return n; }), 800);
        }
        break;

      case 'VAULT_UPDATE':
        if (msg.data.vault) setVault(msg.data.vault);
        break;

      case 'CONNECTION_STATUS':
        if (msg.data.platform && msg.data.status) {
          setConnections(prev => prev.map(c =>
            c.platform === msg.data.platform ? { ...c, status: msg.data.status as Connection['status'] } : c
          ));
        }
        break;
    }
  }, []);

  const { connected } = useWebSocket(handleMessage);

  const activeAgents = agents.filter(a => a.status === 'active' || a.status === 'executing');
  const totalTrades  = agents.reduce((s, a) => s + a.totalTrades, 0);
  const avgWin       = agents.length > 0
    ? (agents.reduce((s, a) => s + a.winRate, 0) / agents.length * 100).toFixed(1) + '%'
    : '—';

  const handleAgentUpdated = (updated: Agent) => {
    setAgents(prev => {
      const i = prev.findIndex(a => a.id === updated.id);
      if (i >= 0) { const n = [...prev]; n[i] = updated; return n; }
      return prev;
    });
  };

  const handleConnUpdate = (platform: string, status: string) => {
    setConnections(prev => prev.map(c =>
      c.platform === platform ? { ...c, status: status as Connection['status'] } : c
    ));
  };

  return (
    <div className="app">
      <Header vault={vault} connected={connected} onOpenSettings={() => { setSettingsAgent(null); setSettingsOpen(true); }} />

      {/* Stats bar */}
      <div className="stats-bar">
        <div className="stat-box">
          <div className="stat-label">ACTIVE AGENTS</div>
          <div className="stat-value">
            <span style={{ color: 'var(--green)' }}>{activeAgents.length}</span>
            <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>/{agents.length}</span>
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">TOTAL TRADES</div>
          <div className="stat-value gold">{totalTrades.toLocaleString()}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">WIN RATE</div>
          <div className="stat-value green">{avgWin}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">DAY P/L</div>
          <div className="stat-value" style={{ color: (vault?.dailyPnl ?? 0) >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 18 }}>
            {fmt2(vault?.dailyPnl ?? 0)}
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="main">
        {/* Field Agents */}
        <div>
          <div className="section-hdr">
            <span className="section-title">FIELD AGENTS</span>
            <button className="btn-deploy" onClick={() => { setSettingsAgent(null); setSettingsOpen(true); }}>
              + DEPLOY AGENT
            </button>
          </div>

          {agents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-dim)', fontSize: 11, letterSpacing: 3 }}>
              CONNECTING TO FIELD AGENTS...
            </div>
          ) : (
            <div className="agents-grid">
              {agents.map(agent => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onSettings={id => { setSettingsAgent(id); setSettingsOpen(true); }}
                  isFlashing={flashing.has(agent.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div>
          <VaultDisplay vault={vault} />
          <ProfitsPipeline agents={agents} />
          <TradeActivity trades={trades} />
        </div>
      </div>

      <SettingsModal
        isOpen={settingsOpen}
        agentId={settingsAgent}
        agents={agents}
        connections={connections}
        onClose={() => setSettingsOpen(false)}
        onAgentUpdated={handleAgentUpdated}
        onConnectionUpdate={handleConnUpdate}
      />
    </div>
  );
};

export default Dashboard;
