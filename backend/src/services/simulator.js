const { broadcast, getVaultData, formatAgent, formatTrade } = require('../websocket');

const INSTRUMENTS = {
  forex: [
    { symbol: 'EUR/USD', basePrice: 1.0850 },
    { symbol: 'GBP/USD', basePrice: 1.2650 },
    { symbol: 'USD/JPY', basePrice: 149.50 },
    { symbol: 'AUD/USD', basePrice: 0.6550 },
    { symbol: 'USD/CHF', basePrice: 0.8950 },
    { symbol: 'NZD/USD', basePrice: 0.6100 }
  ],
  stocks: [
    { symbol: 'SPY', basePrice: 515.00 },
    { symbol: 'QQQ', basePrice: 438.00 },
    { symbol: 'AAPL', basePrice: 182.00 },
    { symbol: 'TSLA', basePrice: 185.00 },
    { symbol: 'NVDA', basePrice: 840.00 },
    { symbol: 'MSFT', basePrice: 415.00 }
  ],
  crypto: [
    { symbol: 'BTC/USD', basePrice: 67000 },
    { symbol: 'ETH/USD', basePrice: 3500 },
    { symbol: 'SOL/USD', basePrice: 175 },
    { symbol: 'BNB/USD', basePrice: 395 }
  ],
  futures: [
    { symbol: 'ES', basePrice: 5150 },
    { symbol: 'NQ', basePrice: 18250 },
    { symbol: 'CL', basePrice: 78.5 },
    { symbol: 'GC', basePrice: 2320 },
    { symbol: 'ZB', basePrice: 118.5 }
  ]
};

let simulatorTimers = [];
let db = null;

function startSimulator(database, wss) {
  db = database;

  // Schedule trades for each active agent
  scheduleAgentCycles();

  // Reset daily stats at midnight (simulated)
  setInterval(() => {
    resetDailyStats();
  }, 24 * 60 * 60 * 1000);

  console.log('[Simulator] Started - trading bots are active');
}

function scheduleAgentCycles() {
  // Clear existing timers
  simulatorTimers.forEach(t => clearTimeout(t));
  simulatorTimers = [];

  const agents = db.prepare("SELECT * FROM agents WHERE platform = 'simulator' AND status != 'offline'").all();

  for (const agent of agents) {
    scheduleNextTrade(agent, true); // First trades fire quickly
  }
}

function scheduleNextTrade(agent, firstTrade = false) {
  // First trade fires quickly (3-12s) for demo feel; subsequent trades every 1-3 min
  const minMs = firstTrade ? 3000 : 60 * 1000;
  const maxMs = firstTrade ? 12000 : 3 * 60 * 1000;
  const delay = minMs + Math.random() * (maxMs - minMs);

  const timer = setTimeout(() => {
    executeTrade(agent.id);
  }, delay);

  simulatorTimers.push(timer);
}

function executeTrade(agentId) {
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
  if (!agent || agent.status === 'offline') return;

  // Set status to executing
  db.prepare("UPDATE agents SET status = 'executing', open_positions = 1 WHERE id = ?").run(agentId);

  // Broadcast status change
  const updatedAgent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
  broadcast('AGENT_UPDATE', { agent: formatAgent(updatedAgent) });

  // Simulate trade execution time (2-8 seconds)
  const executionTime = 2000 + Math.random() * 6000;

  setTimeout(() => {
    closeTrade(agentId, agent);
    scheduleNextTrade(agent);
  }, executionTime);
}

function closeTrade(agentId, agentSnapshot) {
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
  if (!agent) return;

  const market = INSTRUMENTS[agent.preferred_market] || INSTRUMENTS.forex;
  const instrument = market[Math.floor(Math.random() * market.length)];
  const direction = Math.random() > 0.5 ? 'long' : 'short';

  // Determine win/loss based on win rate
  const isWin = Math.random() < agent.win_rate;

  // Calculate P&L (0.05% to 0.3% of allocated funds per trade)
  const riskPct = 0.0005 + Math.random() * 0.0025;
  const riskAmount = agent.allocated_funds * riskPct;
  const rewardRatio = 1.2 + Math.random() * 0.8; // 1.2:1 to 2:1 R:R
  const pnl = isWin ? riskAmount * rewardRatio : -riskAmount;

  // Calculate prices
  const priceVariance = instrument.basePrice * 0.002;
  const entryPrice = instrument.basePrice + (Math.random() - 0.5) * priceVariance;
  const priceDiff = Math.abs(pnl) / (agent.allocated_funds * 0.01);
  const exitPrice = direction === 'long'
    ? entryPrice + (isWin ? priceDiff : -priceDiff)
    : entryPrice + (isWin ? -priceDiff : priceDiff);

  // Insert trade
  const tradeResult = db.prepare(`
    INSERT INTO trades (agent_id, symbol, direction, entry_price, exit_price, pnl, status, platform, closed_at)
    VALUES (?, ?, ?, ?, ?, ?, 'closed', 'simulator', CURRENT_TIMESTAMP)
  `).run(agentId, instrument.symbol, direction, entryPrice, exitPrice, pnl);

  // Update agent stats
  const newBalance = agent.current_balance + pnl;
  const newTotalPnl = agent.total_pnl + pnl;
  const newDailyPnl = agent.daily_pnl + pnl;
  const newWeeklyPnl = agent.weekly_pnl + pnl;
  const newTotalTrades = agent.total_trades + 1;
  const newTodayTrades = agent.today_trades + 1;

  // Recalculate win rate from actual trades
  const tradeStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as wins
    FROM trades WHERE agent_id = ?
  `).get(agentId);

  const newWinRate = tradeStats.total > 0 ? tradeStats.wins / tradeStats.total : agent.win_rate;

  // Update chart data - append new price point
  const chartData = JSON.parse(agent.chart_data || '[]');
  chartData.push(parseFloat(entryPrice.toFixed(agent.preferred_market === 'forex' ? 5 : 2)));
  if (chartData.length > 30) chartData.shift();

  // Determine next status
  const nextStatus = agent.status === 'offline' ? 'offline' : 'active';

  db.prepare(`
    UPDATE agents SET
      status = ?,
      current_balance = ?,
      daily_pnl = ?,
      weekly_pnl = ?,
      total_pnl = ?,
      total_trades = ?,
      today_trades = ?,
      win_rate = ?,
      open_positions = 0,
      current_symbol = ?,
      current_direction = ?,
      chart_data = ?
    WHERE id = ?
  `).run(
    nextStatus,
    newBalance,
    newDailyPnl,
    newWeeklyPnl,
    newTotalPnl,
    newTotalTrades,
    newTodayTrades,
    newWinRate,
    instrument.symbol,
    direction,
    JSON.stringify(chartData),
    agentId
  );

  // Broadcast updates
  const updatedAgent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
  const trade = db.prepare(`
    SELECT t.*, a.codename as agent_codename
    FROM trades t JOIN agents a ON t.agent_id = a.id
    WHERE t.id = ?
  `).get(tradeResult.lastInsertRowid);

  broadcast('AGENT_UPDATE', { agent: formatAgent(updatedAgent) });
  broadcast('TRADE_EXECUTED', { trade: formatTrade(trade) });
  broadcast('VAULT_UPDATE', { vault: getVaultData(db) });

  const pnlStr = pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`;
  console.log(`[Simulator] ${agent.codename} ${direction.toUpperCase()} ${instrument.symbol} -> ${pnlStr}`);
}

function resetDailyStats() {
  db.prepare("UPDATE agents SET daily_pnl = 0, today_trades = 0").run();
  console.log('[Simulator] Daily stats reset');
}

module.exports = { startSimulator };
