/**
 * NinjaTrader 8 Integration Service
 *
 * NinjaTrader 8 exposes a REST API when the HTTP server is enabled.
 * To enable: Tools > Options > NinjaScript > Enable HTTP Server
 * Default URL: http://localhost:8080
 *
 * NT8 REST API Endpoints:
 *   GET /NinjaTrader/accounts - List all accounts
 *   GET /NinjaTrader/account/{id}/positions - Open positions
 *   GET /NinjaTrader/account/{id}/orders - Order history
 *   GET /NinjaTrader/account/{id}/executions - Trade executions
 *   GET /NinjaTrader/account/{id}/performance - Performance stats
 */

const axios = require('axios');
const { broadcast, getVaultData, formatAgent, formatTrade } = require('../websocket');

let pollingInterval = null;
let db = null;

const NT_BASE_URL = 'http://localhost:8080';
const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

async function startPolling(database, wss) {
  db = database;

  // Check if NT8 is connected on startup
  await checkConnection();

  // Poll every 5 minutes
  pollingInterval = setInterval(async () => {
    await syncAllNTAgents();
  }, POLL_INTERVAL);
}

async function checkConnection() {
  const conn = db.prepare("SELECT * FROM connections WHERE platform = 'ninjatrader'").get();
  if (!conn) return false;

  const config = JSON.parse(conn.config || '{}');
  const host = config.host || 'localhost';
  const port = config.port || 8080;

  try {
    const response = await axios.get(`http://${host}:${port}/NinjaTrader/accounts`, {
      timeout: 3000,
      auth: config.username ? {
        username: config.username,
        password: config.password || ''
      } : undefined
    });

    db.prepare("UPDATE connections SET status = 'connected', last_sync = CURRENT_TIMESTAMP WHERE platform = 'ninjatrader'").run();
    broadcast('CONNECTION_STATUS', {
      platform: 'ninjatrader',
      status: 'connected',
      accounts: response.data
    });
    console.log('[NinjaTrader] Connected successfully');
    return true;
  } catch (err) {
    db.prepare("UPDATE connections SET status = 'disconnected' WHERE platform = 'ninjatrader'").run();
    // Silently fail - NT8 may not be running
    return false;
  }
}

async function syncAllNTAgents() {
  const conn = db.prepare("SELECT * FROM connections WHERE platform = 'ninjatrader'").get();
  if (!conn || conn.status !== 'connected') return;

  const config = JSON.parse(conn.config || '{}');
  const ntAgents = db.prepare("SELECT * FROM agents WHERE platform = 'ninjatrader'").all();

  for (const agent of ntAgents) {
    if (agent.account_id) {
      await syncAgentAccount(agent, config);
    }
  }
}

async function syncAgentAccount(agent, config) {
  const host = config.host || 'localhost';
  const port = config.port || 8080;
  const baseUrl = `http://${host}:${port}/NinjaTrader`;

  try {
    // Get account performance
    const perfResponse = await axios.get(`${baseUrl}/account/${agent.account_id}/performance`, {
      timeout: 5000,
      auth: config.username ? { username: config.username, password: config.password } : undefined
    });

    const perf = perfResponse.data;

    // Get open positions
    const posResponse = await axios.get(`${baseUrl}/account/${agent.account_id}/positions`, {
      timeout: 5000,
      auth: config.username ? { username: config.username, password: config.password } : undefined
    });

    const positions = posResponse.data || [];
    const openPositions = positions.length;

    // Get recent executions (last 50)
    const execResponse = await axios.get(`${baseUrl}/account/${agent.account_id}/executions`, {
      timeout: 5000,
      auth: config.username ? { username: config.username, password: config.password } : undefined
    });

    const executions = execResponse.data || [];

    // Update agent with live data
    db.prepare(`
      UPDATE agents SET
        current_balance = ?,
        daily_pnl = ?,
        total_pnl = ?,
        total_trades = ?,
        open_positions = ?,
        status = ?
      WHERE id = ?
    `).run(
      perf.accountValue || agent.current_balance,
      perf.todayPnl || 0,
      perf.totalNetProfit || 0,
      perf.totalTrades || agent.total_trades,
      openPositions,
      openPositions > 0 ? 'executing' : 'active',
      agent.id
    );

    // Import any new executions as trades
    for (const exec of executions.slice(-10)) {
      const exists = db.prepare('SELECT id FROM trades WHERE id = ?').get(`nt_${exec.orderId}`);
      if (!exists) {
        db.prepare(`
          INSERT OR IGNORE INTO trades
            (agent_id, symbol, direction, entry_price, exit_price, pnl, status, platform, opened_at, closed_at)
          VALUES (?, ?, ?, ?, ?, ?, 'closed', 'ninjatrader', ?, ?)
        `).run(
          agent.id,
          exec.instrument || '',
          exec.action === 'Buy' ? 'long' : 'short',
          exec.avgFillPrice || 0,
          exec.avgFillPrice || 0,
          exec.realizedPnl || 0,
          exec.time || new Date().toISOString(),
          exec.time || new Date().toISOString()
        );
      }
    }

    const updatedAgent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agent.id);
    broadcast('AGENT_UPDATE', { agent: formatAgent(updatedAgent) });
    broadcast('VAULT_UPDATE', { vault: getVaultData(db) });

  } catch (err) {
    // Connection lost
    db.prepare("UPDATE connections SET status = 'disconnected' WHERE platform = 'ninjatrader'").run();
    broadcast('CONNECTION_STATUS', { platform: 'ninjatrader', status: 'disconnected' });
  }
}

async function connectNinjaTrader(config) {
  if (db) {
    db.prepare(`
      UPDATE connections SET config = ?, status = 'connecting' WHERE platform = 'ninjatrader'
    `).run(JSON.stringify(config));
  }
  return await checkConnection();
}

module.exports = { startPolling, connectNinjaTrader, syncAllNTAgents };
