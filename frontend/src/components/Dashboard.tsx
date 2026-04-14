import React, { useState, useCallback, useEffect } from 'react';
import type { Agent, Trade, VaultData, Connection, WSMessage } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';
import Header from './Header';
import AgentCard from './AgentCard';
import VaultDisplay from './VaultDisplay';
import ProfitsPipeline from './ProfitsPipeline';
import TradeActivity from './TradeActivity';
import SettingsModal from './SettingsModal';

const Dashboard: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [vault, setVault] = useState<VaultData | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [flashingAgents, setFlashingAgents] = useState<Set<number>>(new Set());

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsAgentId, setSettingsAgentId] = useState<number | null>(null);

  // Ticker clock for header
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleMessage = useCallback((msg: WSMessage) => {
    switch (msg.type) {
      case 'INIT':
        if (msg.data.agents) setAgents(msg.data.agents);
        if (msg.data.vault) setVault(msg.data.vault);
        if (msg.data.trades) setTrades(msg.data.trades);
        if (msg.data.connections) setConnections(msg.data.connections);
        break;

      case 'AGENT_UPDATE':
        if (msg.data.agent) {
          setAgents(prev => {
            const idx = prev.findIndex(a => a.id === msg.data.agent!.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = msg.data.agent!;
              return next;
            }
            return [...prev, msg.data.agent!];
          });
        }
        break;

      case 'TRADE_EXECUTED':
        if (msg.data.trade) {
          const trade = msg.data.trade;
          setTrades(prev => [trade, ...prev].slice(0, 100));

          // Flash the agent card
          setFlashingAgents(prev => {
            const next = new Set(prev);
            next.add(trade.agentId);
            return next;
          });
          setTimeout(() => {
            setFlashingAgents(prev => {
              const next = new Set(prev);
              next.delete(trade.agentId);
              return next;
            });
          }, 800);
        }
        break;

      case 'VAULT_UPDATE':
        if (msg.data.vault) setVault(msg.data.vault);
        break;

      case 'CONNECTION_STATUS':
        if (msg.data.platform && msg.data.status) {
          setConnections(prev => prev.map(c =>
            c.platform === msg.data.platform
              ? { ...c, status: msg.data.status as Connection['status'] }
              : c
          ));
        }
        break;
    }
  }, []);

  const { connected } = useWebSocket(handleMessage);

  const openAgentSettings = (agentId: number) => {
    setSettingsAgentId(agentId);
    setSettingsOpen(true);
  };

  const openGlobalSettings = () => {
    setSettingsAgentId(null);
    setSettingsOpen(true);
  };

  const handleAgentUpdated = (updated: Agent) => {
    setAgents(prev => {
      const idx = prev.findIndex(a => a.id === updated.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return prev;
    });
  };

  const handleConnectionUpdate = (platform: string, status: string) => {
    setConnections(prev => prev.map(c =>
      c.platform === platform ? { ...c, status: status as Connection['status'] } : c
    ));
  };

  const activeCount = agents.filter(a => a.status === 'active' || a.status === 'executing').length;

  return (
    <div className="app-container">
      <Header
        vault={vault}
        connected={connected}
        onOpenSettings={openGlobalSettings}
      />

      {/* Stats bar */}
      <div className="stats-bar">
        <div className="stat-pill">
          <span className="stat-pill-label">FIELD AGENTS</span>
          <span className="stat-pill-value" style={{ color: 'var(--text-primary)' }}>
            {activeCount} <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/ {agents.length}</span>
          </span>
        </div>
        <div className="stat-pill">
          <span className="stat-pill-label">TODAY TRADES</span>
          <span className="stat-pill-value" style={{ color: 'var(--accent-gold)' }}>
            {agents.reduce((s, a) => s + a.todayTrades, 0)}
          </span>
        </div>
        <div className="stat-pill">
          <span className="stat-pill-label">AVG WIN RATE</span>
          <span className="stat-pill-value" style={{ color: 'var(--text-primary)' }}>
            {agents.length > 0
              ? ((agents.reduce((s, a) => s + a.winRate, 0) / agents.length) * 100).toFixed(1) + '%'
              : '—'}
          </span>
        </div>
        <div className="stat-pill">
          <span className="stat-pill-label">DAY P&L</span>
          <span className="stat-pill-value" style={{
            color: (vault?.dailyPnl ?? 0) >= 0 ? 'var(--text-primary)' : 'var(--accent-red)'
          }}>
            {(vault?.dailyPnl ?? 0) >= 0 ? '+' : ''}${(vault?.dailyPnl ?? 0).toFixed(2)}
          </span>
        </div>
        <div className="stat-pill">
          <span className="stat-pill-label">TOTAL ROI</span>
          <span className="stat-pill-value" style={{
            color: (vault?.roi ?? 0) >= 0 ? 'var(--accent-gold)' : 'var(--accent-red)'
          }}>
            {(vault?.roi ?? 0) >= 0 ? '+' : ''}{(vault?.roi ?? 0).toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Main layout */}
      <div className="main-layout">
        {/* LEFT: Field Agents */}
        <div>
          <div className="section-header">
            <span className="section-title">FIELD AGENTS</span>
            <span className="section-badge">
              {activeCount} ON MISSION
            </span>
          </div>

          {agents.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: 'var(--text-muted)',
              fontSize: 12,
              letterSpacing: 3
            }}>
              CONNECTING TO FIELD AGENTS...
            </div>
          ) : (
            <div className="agents-grid">
              {agents.map(agent => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onSettings={openAgentSettings}
                  isFlashing={flashingAgents.has(agent.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Vault + Pipeline + Activity */}
        <div>
          <VaultDisplay vault={vault} />
          <ProfitsPipeline agents={agents} />
          <TradeActivity trades={trades} />
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        agentId={settingsAgentId}
        agents={agents}
        connections={connections}
        onClose={() => setSettingsOpen(false)}
        onAgentUpdated={handleAgentUpdated}
        onConnectionUpdate={handleConnectionUpdate}
      />
    </div>
  );
};

export default Dashboard;
