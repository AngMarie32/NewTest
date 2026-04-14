/**
 * Pure JavaScript data store — no native compilation needed.
 * Persists to a JSON file using Node's built-in fs module.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'vault.json');

class DataStore {
  constructor() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    this.data = this._load();
    this._nextIds = {
      agents: this._maxId('agents'),
      trades: this._maxId('trades'),
      snapshots: this._maxId('snapshots')
    };
  }

  _maxId(table) {
    const rows = this.data[table] || [];
    return rows.length > 0 ? Math.max(...rows.map(r => r.id)) + 1 : 1;
  }

  _load() {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(raw);
    } catch {
      return { agents: [], trades: [], connections: [], snapshots: [] };
    }
  }

  _save() {
    fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2));
  }

  // ── AGENTS ────────────────────────────────────────────────────────────────

  getAgents() {
    return this.data.agents;
  }

  getAgent(id) {
    return this.data.agents.find(a => a.id === Number(id)) || null;
  }

  insertAgent(agent) {
    const row = {
      id: this._nextIds.agents++,
      name: agent.name,
      codename: agent.codename,
      status: agent.status || 'standby',
      allocated_funds: agent.allocated_funds || 10000,
      current_balance: agent.current_balance || 10000,
      daily_pnl: 0,
      weekly_pnl: 0,
      total_pnl: 0,
      win_rate: agent.win_rate || 0.65,
      total_trades: 0,
      today_trades: 0,
      open_positions: 0,
      platform: agent.platform || 'simulator',
      account_id: agent.account_id || '',
      preferred_market: agent.preferred_market || 'forex',
      current_symbol: '',
      current_direction: '',
      chart_data: agent.chart_data || '[]',
      agent_color: agent.agent_color || '#00ff41',
      created_at: new Date().toISOString()
    };
    this.data.agents.push(row);
    this._save();
    return row;
  }

  updateAgent(id, updates) {
    const idx = this.data.agents.findIndex(a => a.id === Number(id));
    if (idx < 0) return null;
    this.data.agents[idx] = { ...this.data.agents[idx], ...updates };
    this._save();
    return this.data.agents[idx];
  }

  deleteAgent(id) {
    this.data.agents = this.data.agents.filter(a => a.id !== Number(id));
    this._save();
  }

  // ── TRADES ────────────────────────────────────────────────────────────────

  getTrades({ agentId, platform, limit = 100 } = {}) {
    let rows = [...this.data.trades];
    if (agentId) rows = rows.filter(t => t.agent_id === Number(agentId));
    if (platform) rows = rows.filter(t => t.platform === platform);
    // Most recent first
    rows.sort((a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime());
    return rows.slice(0, limit).map(t => {
      const agent = this.getAgent(t.agent_id);
      return { ...t, agent_codename: agent?.codename || '', agent_color: agent?.agent_color || '' };
    });
  }

  insertTrade(trade) {
    const row = {
      id: this._nextIds.trades++,
      agent_id: Number(trade.agent_id),
      symbol: trade.symbol,
      direction: trade.direction,
      entry_price: trade.entry_price || 0,
      exit_price: trade.exit_price || 0,
      quantity: trade.quantity || 1,
      pnl: trade.pnl || 0,
      status: trade.status || 'closed',
      platform: trade.platform || 'simulator',
      opened_at: trade.opened_at || new Date().toISOString(),
      closed_at: trade.closed_at || new Date().toISOString()
    };
    this.data.trades.push(row);
    // Keep max 5000 trades in file
    if (this.data.trades.length > 5000) {
      this.data.trades = this.data.trades.slice(-5000);
    }
    this._save();
    return row;
  }

  getTradeStats(agentId) {
    let trades = this.data.trades;
    if (agentId) trades = trades.filter(t => t.agent_id === Number(agentId));
    const total = trades.length;
    const wins = trades.filter(t => t.pnl > 0).length;
    const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);
    return {
      totalTrades: total,
      wins,
      losses: total - wins,
      totalPnl,
      avgWin: winningTrades.length > 0 ? winningTrades.reduce((s, t) => s + t.pnl, 0) / winningTrades.length : 0,
      avgLoss: losingTrades.length > 0 ? losingTrades.reduce((s, t) => s + t.pnl, 0) / losingTrades.length : 0,
      bestTrade: trades.length > 0 ? Math.max(...trades.map(t => t.pnl)) : 0,
      worstTrade: trades.length > 0 ? Math.min(...trades.map(t => t.pnl)) : 0,
      winRate: total > 0 ? wins / total : 0
    };
  }

  // ── CONNECTIONS ───────────────────────────────────────────────────────────

  getConnections() {
    return this.data.connections;
  }

  getConnection(platform) {
    return this.data.connections.find(c => c.platform === platform) || null;
  }

  upsertConnection(platform, updates) {
    const idx = this.data.connections.findIndex(c => c.platform === platform);
    if (idx >= 0) {
      this.data.connections[idx] = { ...this.data.connections[idx], ...updates };
    } else {
      this.data.connections.push({ id: Date.now(), platform, status: 'disconnected', config: '{}', last_sync: null, ...updates });
    }
    this._save();
    return this.getConnection(platform);
  }

  // ── SNAPSHOTS ─────────────────────────────────────────────────────────────

  insertSnapshot(snap) {
    const row = { id: this._nextIds.snapshots++, ...snap, recorded_at: new Date().toISOString() };
    this.data.snapshots.push(row);
    if (this.data.snapshots.length > 1000) this.data.snapshots = this.data.snapshots.slice(-1000);
    this._save();
    return row;
  }

  getSnapshots(hours = 24) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    return this.data.snapshots.filter(s => s.recorded_at > cutoff);
  }
}

module.exports = { DataStore };
