const axios = require('axios');
const { broadcast, getVaultData, formatAgent } = require('../websocket');

let pollingInterval = null;
let store = null;

async function startPolling(database) {
  store = database;
  await checkConnection();
  pollingInterval = setInterval(syncAllNTAgents, 5 * 60 * 1000);
}

async function checkConnection() {
  const conn = store.getConnection('ninjatrader');
  if (!conn) return false;
  const cfg = JSON.parse(conn.config || '{}');
  const host = cfg.host || 'localhost';
  const port = cfg.port || 8080;

  try {
    await axios.get(`http://${host}:${port}/NinjaTrader/accounts`, {
      timeout: 3000,
      ...(cfg.username ? { auth: { username: cfg.username, password: cfg.password || '' } } : {})
    });
    store.upsertConnection('ninjatrader', { status: 'connected', last_sync: new Date().toISOString() });
    broadcast('CONNECTION_STATUS', { platform: 'ninjatrader', status: 'connected' });
    console.log('[NinjaTrader] Connected');
    return true;
  } catch {
    store.upsertConnection('ninjatrader', { status: 'disconnected' });
    return false;
  }
}

async function syncAllNTAgents() {
  const conn = store.getConnection('ninjatrader');
  if (!conn || conn.status !== 'connected') return;

  const cfg = JSON.parse(conn.config || '{}');
  const ntAgents = store.getAgents().filter(a => a.platform === 'ninjatrader' && a.account_id);

  for (const agent of ntAgents) {
    await syncAgent(agent, cfg);
  }
}

async function syncAgent(agent, cfg) {
  const base = `http://${cfg.host || 'localhost'}:${cfg.port || 8080}/NinjaTrader`;
  const auth = cfg.username ? { auth: { username: cfg.username, password: cfg.password } } : {};

  try {
    const [perfRes, posRes] = await Promise.all([
      axios.get(`${base}/account/${agent.account_id}/performance`, { timeout: 5000, ...auth }),
      axios.get(`${base}/account/${agent.account_id}/positions`,   { timeout: 5000, ...auth })
    ]);

    const perf = perfRes.data;
    const openPositions = (posRes.data || []).length;

    store.updateAgent(agent.id, {
      current_balance: perf.accountValue   || agent.current_balance,
      daily_pnl:       perf.todayPnl       || 0,
      total_pnl:       perf.totalNetProfit || 0,
      total_trades:    perf.totalTrades    || agent.total_trades,
      open_positions:  openPositions,
      status:          openPositions > 0 ? 'executing' : 'active'
    });

    broadcast('AGENT_UPDATE', { agent: formatAgent(store.getAgent(agent.id)) });
    broadcast('VAULT_UPDATE', { vault: getVaultData(store) });
  } catch {
    store.upsertConnection('ninjatrader', { status: 'disconnected' });
    broadcast('CONNECTION_STATUS', { platform: 'ninjatrader', status: 'disconnected' });
  }
}

async function connectNinjaTrader(config, database) {
  if (database) store = database;
  return await checkConnection();
}

module.exports = { startPolling, connectNinjaTrader };
