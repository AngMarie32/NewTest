import React, { useState, useEffect } from 'react';
import type { Agent, Connection } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  agentId: number | null;
  agents: Agent[];
  connections: Connection[];
  onClose: () => void;
  onAgentUpdated: (agent: Agent) => void;
  onConnectionUpdate: (platform: string, status: string) => void;
}

const PRESET_AMOUNTS = [500, 1000, 5000, 10000];

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  agentId,
  agents,
  connections,
  onClose,
  onAgentUpdated,
  onConnectionUpdate
}) => {
  const [tab, setTab] = useState<'funds' | 'agent' | 'connections'>('funds');
  const [selectedAgentId, setSelectedAgentId] = useState<number>(agentId || (agents[0]?.id ?? 0));
  const [fundAmount, setFundAmount] = useState('');
  const [fundAction, setFundAction] = useState<'add' | 'remove' | 'set'>('add');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // NT8 connection form
  const [ntHost, setNtHost] = useState('localhost');
  const [ntPort, setNtPort] = useState('8080');
  const [ntUser, setNtUser] = useState('');
  const [ntPass, setNtPass] = useState('');

  // TradingView form
  const [tvSecret, setTvSecret] = useState('');

  // Agent edit form
  const [agentName, setAgentName] = useState('');
  const [agentCodename, setAgentCodename] = useState('');
  const [agentPlatform, setAgentPlatform] = useState('simulator');
  const [agentMarket, setAgentMarket] = useState('forex');
  const [agentColor, setAgentColor] = useState('#00ff41');
  const [agentStatus, setAgentStatus] = useState('active');

  const selectedAgent = agents.find(a => a.id === selectedAgentId);
  const ntConn = connections.find(c => c.platform === 'ninjatrader');
  const tvConn = connections.find(c => c.platform === 'tradingview');

  useEffect(() => {
    if (agentId) setSelectedAgentId(agentId);
    setTab(agentId ? 'funds' : 'connections');
  }, [agentId, isOpen]);

  useEffect(() => {
    if (selectedAgent) {
      setAgentName(selectedAgent.name);
      setAgentCodename(selectedAgent.codename);
      setAgentPlatform(selectedAgent.platform);
      setAgentMarket(selectedAgent.preferredMarket);
      setAgentColor(selectedAgent.agentColor);
      setAgentStatus(selectedAgent.status);
    }
  }, [selectedAgent]);

  useEffect(() => {
    if (ntConn?.config) {
      const cfg = ntConn.config as Record<string, string>;
      setNtHost(cfg.host || 'localhost');
      setNtPort(String(cfg.port || 8080));
      setNtUser(cfg.username || '');
    }
    if (tvConn?.config) {
      const cfg = tvConn.config as Record<string, string>;
      setTvSecret(cfg.webhookSecret || '');
    }
  }, [ntConn, tvConn]);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleAddFunds = async () => {
    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0) {
      showMessage('ERROR: Invalid amount');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/${selectedAgentId}/funds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, action: fundAction })
      });
      const updated = await res.json();
      onAgentUpdated(updated);
      showMessage(`SUCCESS: ${fundAction.toUpperCase()} $${amount.toFixed(2)} processed`);
      setFundAmount('');
    } catch {
      showMessage('ERROR: Failed to update funds');
    }
    setLoading(false);
  };

  const handleSaveAgent = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/${selectedAgentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: agentName,
          codename: agentCodename,
          platform: agentPlatform,
          preferredMarket: agentMarket,
          agentColor,
          status: agentStatus
        })
      });
      const updated = await res.json();
      onAgentUpdated(updated);
      showMessage('SUCCESS: Agent configuration saved');
    } catch {
      showMessage('ERROR: Failed to save agent');
    }
    setLoading(false);
  };

  const handleConnectNT = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/connections/ninjatrader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: ntHost, port: parseInt(ntPort), username: ntUser, password: ntPass })
      });
      const data = await res.json();
      onConnectionUpdate('ninjatrader', data.success ? 'connected' : 'disconnected');
      showMessage(data.success ? 'SUCCESS: NinjaTrader connected' : 'ERROR: Cannot reach NinjaTrader. Ensure NT8 HTTP server is enabled.');
    } catch {
      showMessage('ERROR: Connection failed');
    }
    setLoading(false);
  };

  const handleSaveTV = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/connections/tradingview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookSecret: tvSecret })
      });
      const data = await res.json();
      showMessage('SUCCESS: TradingView webhook configured');
      onConnectionUpdate('tradingview', 'disconnected');
      console.log('TV webhook URL:', data.webhookUrl);
    } catch {
      showMessage('ERROR: Failed to configure');
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">OPERATIONS CONTROL</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-tabs">
          <button className={`modal-tab ${tab === 'funds' ? 'active' : ''}`} onClick={() => setTab('funds')}>
            FUND OPS
          </button>
          <button className={`modal-tab ${tab === 'agent' ? 'active' : ''}`} onClick={() => setTab('agent')}>
            AGENT CFG
          </button>
          <button className={`modal-tab ${tab === 'connections' ? 'active' : ''}`} onClick={() => setTab('connections')}>
            CONNECTIONS
          </button>
        </div>

        <div className="modal-body">
          {message && (
            <div style={{
              padding: '8px 12px',
              marginBottom: 12,
              border: `1px solid ${message.startsWith('ERROR') ? 'var(--accent-red)' : 'var(--border-active)'}`,
              color: message.startsWith('ERROR') ? 'var(--accent-red)' : 'var(--text-primary)',
              fontSize: 10,
              letterSpacing: 2,
              background: message.startsWith('ERROR') ? 'rgba(255,68,68,0.05)' : 'rgba(0,255,65,0.05)'
            }}>
              {message}
            </div>
          )}

          {/* FUNDS TAB */}
          {tab === 'funds' && (
            <div>
              <div className="form-group">
                <label className="form-label">SELECT AGENT</label>
                <select
                  className="form-select"
                  value={selectedAgentId}
                  onChange={e => setSelectedAgentId(Number(e.target.value))}
                >
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.codename} — ${a.currentBalance.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedAgent && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                  padding: '10px 12px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-dim)',
                  marginBottom: 16
                }}>
                  <div>
                    <div style={{ fontSize: 8, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 2 }}>CURRENT BALANCE</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: selectedAgent.agentColor }}>
                      ${selectedAgent.currentBalance.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 8, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 2 }}>ALLOCATED FUNDS</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--accent-gold)' }}>
                      ${selectedAgent.allocatedFunds.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 8, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 2 }}>TOTAL P&L</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: selectedAgent.totalPnl >= 0 ? 'var(--text-primary)' : 'var(--accent-red)' }}>
                      {selectedAgent.totalPnl >= 0 ? '+' : ''}${selectedAgent.totalPnl.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 8, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 2 }}>WIN RATE</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--accent-gold)' }}>
                      {(selectedAgent.winRate * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">OPERATION TYPE</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {(['add', 'remove', 'set'] as const).map(action => (
                    <button
                      key={action}
                      className="fund-btn"
                      onClick={() => setFundAction(action)}
                      style={{
                        borderColor: fundAction === action ? 'var(--border-active)' : 'var(--border-dim)',
                        color: fundAction === action ? 'var(--text-primary)' : 'var(--text-muted)',
                        background: fundAction === action ? 'rgba(0,255,65,0.08)' : 'transparent'
                      }}
                    >
                      {action === 'add' ? '+ ADD' : action === 'remove' ? '- REMOVE' : '= SET'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">AMOUNT ($)</label>
                <div className="fund-buttons">
                  {PRESET_AMOUNTS.map(amt => (
                    <button
                      key={amt}
                      className="fund-btn"
                      onClick={() => setFundAmount(String(amt))}
                    >
                      ${amt >= 1000 ? amt / 1000 + 'K' : amt}
                    </button>
                  ))}
                </div>
                <input
                  className="form-input"
                  type="number"
                  placeholder="ENTER CUSTOM AMOUNT"
                  value={fundAmount}
                  onChange={e => setFundAmount(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddFunds()}
                />
              </div>

              <button className="btn-primary" onClick={handleAddFunds} disabled={loading}>
                {loading ? 'PROCESSING...' : `EXECUTE ${fundAction.toUpperCase()} FUNDS`}
              </button>
            </div>
          )}

          {/* AGENT TAB */}
          {tab === 'agent' && (
            <div>
              <div className="form-group">
                <label className="form-label">SELECT AGENT</label>
                <select
                  className="form-select"
                  value={selectedAgentId}
                  onChange={e => setSelectedAgentId(Number(e.target.value))}
                >
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.codename}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">AGENT NAME</label>
                <input className="form-input" value={agentName} onChange={e => setAgentName(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">CODENAME</label>
                <input className="form-input" value={agentCodename} onChange={e => setAgentCodename(e.target.value.toUpperCase())} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">STATUS</label>
                  <select className="form-select" value={agentStatus} onChange={e => setAgentStatus(e.target.value)}>
                    <option value="active">ACTIVE</option>
                    <option value="standby">STANDBY</option>
                    <option value="offline">OFFLINE</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">MARKET</label>
                  <select className="form-select" value={agentMarket} onChange={e => setAgentMarket(e.target.value)}>
                    <option value="forex">FOREX</option>
                    <option value="stocks">STOCKS</option>
                    <option value="crypto">CRYPTO</option>
                    <option value="futures">FUTURES</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">PLATFORM</label>
                  <select className="form-select" value={agentPlatform} onChange={e => setAgentPlatform(e.target.value)}>
                    <option value="simulator">SIMULATOR</option>
                    <option value="ninjatrader">NINJA TRADER</option>
                    <option value="tradingview">TRADING VIEW</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">AGENT COLOR</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="color"
                      value={agentColor}
                      onChange={e => setAgentColor(e.target.value)}
                      style={{ width: 40, height: 38, background: 'none', border: '1px solid var(--border-dim)', cursor: 'pointer', padding: 2 }}
                    />
                    <input className="form-input" value={agentColor} onChange={e => setAgentColor(e.target.value)} style={{ flex: 1 }} />
                  </div>
                </div>
              </div>

              <button className="btn-primary" onClick={handleSaveAgent} disabled={loading}>
                {loading ? 'SAVING...' : 'SAVE AGENT CONFIGURATION'}
              </button>
            </div>
          )}

          {/* CONNECTIONS TAB */}
          {tab === 'connections' && (
            <div>
              {/* Connection Status Overview */}
              <div style={{ marginBottom: 16 }}>
                {[ntConn, tvConn].filter(Boolean).map(conn => conn && (
                  <div key={conn.platform} className="connection-status-row">
                    <span className="connection-platform">
                      {conn.platform === 'ninjatrader' ? 'NINJA TRADER 8' : 'TRADING VIEW'}
                    </span>
                    <span className={`connection-badge ${conn.status}`}>
                      {conn.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>

              <div className="divider" />

              {/* NinjaTrader Section */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: 3, color: 'var(--text-secondary)', marginBottom: 10 }}>
                  NINJA TRADER 8
                </div>

                <div className="info-box">
                  To enable NT8 connection:<br />
                  1. Open NinjaTrader 8<br />
                  2. Tools → Options → NinjaScript<br />
                  3. Enable "HTTP Server" (port 8080)<br />
                  4. Enter credentials below and connect
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 8 }}>
                  <div className="form-group">
                    <label className="form-label">HOST</label>
                    <input className="form-input" value={ntHost} onChange={e => setNtHost(e.target.value)} placeholder="localhost" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">PORT</label>
                    <input className="form-input" value={ntPort} onChange={e => setNtPort(e.target.value)} placeholder="8080" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div className="form-group">
                    <label className="form-label">USERNAME (optional)</label>
                    <input className="form-input" value={ntUser} onChange={e => setNtUser(e.target.value)} placeholder="optional" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">PASSWORD (optional)</label>
                    <input className="form-input" type="password" value={ntPass} onChange={e => setNtPass(e.target.value)} placeholder="optional" />
                  </div>
                </div>

                <button className="btn-primary" onClick={handleConnectNT} disabled={loading}>
                  {loading ? 'CONNECTING...' : 'CONNECT NINJA TRADER'}
                </button>
              </div>

              <div className="divider" />

              {/* TradingView Section */}
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: 3, color: 'var(--text-secondary)', marginBottom: 10 }}>
                  TRADING VIEW
                </div>

                <div className="info-box">
                  TradingView integration uses webhooks (Pro+ required):<br />
                  1. Set webhook URL in your TV alert<br />
                  2. Webhook endpoint: <strong>http://YOUR-IP:3001/api/webhooks/tradingview</strong><br />
                  3. For external access, use ngrok or deploy to a server
                </div>

                <div className="form-group">
                  <label className="form-label">WEBHOOK SECRET (optional)</label>
                  <input
                    className="form-input"
                    value={tvSecret}
                    onChange={e => setTvSecret(e.target.value)}
                    placeholder="SECURE_SECRET_KEY"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">PINE SCRIPT ALERT MESSAGE FORMAT</label>
                  <div className="code-block">{`{
  "agentId": 1,
  "secret": "${tvSecret || 'your-secret'}",
  "symbol": "{{ticker}}",
  "direction": "{{strategy.order.action}}",
  "price": {{close}},
  "pnl": {{strategy.netprofit}},
  "action": "trade"
}`}</div>
                </div>

                <button className="btn-primary" onClick={handleSaveTV} disabled={loading}>
                  {loading ? 'SAVING...' : 'SAVE TRADINGVIEW CONFIG'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
