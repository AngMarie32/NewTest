const { broadcast, getVaultData, formatAgent, formatTrade } = require('../websocket');

const INSTRUMENTS = {
  forex:   [{ symbol: 'EUR/USD', base: 1.0850 }, { symbol: 'GBP/USD', base: 1.2650 }, { symbol: 'USD/JPY', base: 149.50 }, { symbol: 'AUD/USD', base: 0.6550 }, { symbol: 'USD/CHF', base: 0.8950 }],
  stocks:  [{ symbol: 'SPY', base: 515 }, { symbol: 'QQQ', base: 438 }, { symbol: 'AAPL', base: 182 }, { symbol: 'TSLA', base: 185 }, { symbol: 'NVDA', base: 840 }],
  crypto:  [{ symbol: 'BTC/USD', base: 67000 }, { symbol: 'ETH/USD', base: 3500 }, { symbol: 'SOL/USD', base: 175 }],
  futures: [{ symbol: 'ES', base: 5150 }, { symbol: 'NQ', base: 18250 }, { symbol: 'CL', base: 78.5 }, { symbol: 'GC', base: 2320 }]
};

let timers = [];
let store = null;

function startSimulator(database) {
  store = database;
  scheduleCycles();
  setInterval(resetDailyStats, 24 * 60 * 60 * 1000);
  console.log('[Simulator] Started — field agents are active');
}

function scheduleCycles() {
  timers.forEach(t => clearTimeout(t));
  timers = [];
  const agents = store.getAgents().filter(a => a.platform === 'simulator' && a.status !== 'offline');
  for (const agent of agents) scheduleNext(agent, true);
}

function scheduleNext(agent, first = false) {
  const min = first ? 3000 : 60000;
  const max = first ? 12000 : 3 * 60000;
  const delay = min + Math.random() * (max - min);
  timers.push(setTimeout(() => runTrade(agent.id), delay));
}

function runTrade(agentId) {
  const agent = store.getAgent(agentId);
  if (!agent || agent.status === 'offline') return;

  // Mark executing
  store.updateAgent(agentId, { status: 'executing', open_positions: 1 });
  broadcast('AGENT_UPDATE', { agent: formatAgent(store.getAgent(agentId)) });

  const execTime = 2000 + Math.random() * 6000;
  setTimeout(() => closeTrade(agentId), execTime);
}

function closeTrade(agentId) {
  const agent = store.getAgent(agentId);
  if (!agent) return;

  const market = INSTRUMENTS[agent.preferred_market] || INSTRUMENTS.forex;
  const instr = market[Math.floor(Math.random() * market.length)];
  const direction = Math.random() > 0.5 ? 'long' : 'short';
  const isWin = Math.random() < agent.win_rate;

  const riskAmt = agent.allocated_funds * (0.0005 + Math.random() * 0.0025);
  const rrRatio = 1.2 + Math.random() * 0.8;
  const pnl = isWin ? riskAmt * rrRatio : -riskAmt;

  const variance = instr.base * 0.002;
  const entryPrice = instr.base + (Math.random() - 0.5) * variance;
  const priceDiff = Math.abs(pnl) / (agent.allocated_funds * 0.01);
  const exitPrice = direction === 'long'
    ? entryPrice + (isWin ? priceDiff : -priceDiff)
    : entryPrice + (isWin ? -priceDiff : priceDiff);

  // Insert trade
  const trade = store.insertTrade({
    agent_id: agentId,
    symbol: instr.symbol,
    direction,
    entry_price: entryPrice,
    exit_price: exitPrice,
    pnl,
    status: 'closed',
    platform: 'simulator'
  });

  // Recalculate win rate
  const stats = store.getTradeStats(agentId);
  const newWinRate = stats.winRate;

  // Update chart
  const chartData = JSON.parse(agent.chart_data || '[]');
  chartData.push(parseFloat(entryPrice.toFixed(agent.preferred_market === 'forex' ? 5 : 2)));
  if (chartData.length > 30) chartData.shift();

  store.updateAgent(agentId, {
    status: agent.status === 'offline' ? 'offline' : 'active',
    current_balance: agent.current_balance + pnl,
    daily_pnl:  agent.daily_pnl  + pnl,
    weekly_pnl: agent.weekly_pnl + pnl,
    total_pnl:  agent.total_pnl  + pnl,
    total_trades:  agent.total_trades + 1,
    today_trades:  agent.today_trades + 1,
    win_rate:      newWinRate,
    open_positions: 0,
    current_symbol:    instr.symbol,
    current_direction: direction,
    chart_data: JSON.stringify(chartData)
  });

  const updatedAgent = store.getAgent(agentId);
  const tradeWithAgent = { ...trade, agent_codename: agent.codename, agent_color: agent.agent_color };

  broadcast('AGENT_UPDATE',    { agent: formatAgent(updatedAgent) });
  broadcast('TRADE_EXECUTED',  { trade: formatTrade(tradeWithAgent) });
  broadcast('VAULT_UPDATE',    { vault: getVaultData(store) });

  const sign = pnl >= 0 ? '+' : '';
  console.log(`[Simulator] ${agent.codename} ${direction.toUpperCase()} ${instr.symbol} -> ${sign}$${pnl.toFixed(2)}`);

  scheduleNext(agent);
}

function resetDailyStats() {
  for (const agent of store.getAgents()) {
    store.updateAgent(agent.id, { daily_pnl: 0, today_trades: 0 });
  }
  console.log('[Simulator] Daily stats reset');
}

module.exports = { startSimulator };
