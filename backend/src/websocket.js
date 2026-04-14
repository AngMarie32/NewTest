const WebSocket = require('ws');

let wss = null;

function setupWebSocket(server, store) {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    console.log('[WS] Client connected');

    try {
      const agents = store.getAgents();
      const vault = getVaultData(store);
      const trades = store.getTrades({ limit: 50 });
      const connections = store.getConnections().map(c => ({
        ...c, config: JSON.parse(c.config || '{}')
      }));

      ws.send(JSON.stringify({
        type: 'INIT',
        data: {
          agents: agents.map(formatAgent),
          vault,
          trades: trades.map(formatTrade),
          connections
        }
      }));
    } catch (err) {
      console.error('[WS] Init error:', err.message);
    }

    ws.on('message', (message) => {
      try {
        const msg = JSON.parse(message.toString());
        if (msg.type === 'PING') ws.send(JSON.stringify({ type: 'PONG' }));
      } catch { /* ignore */ }
    });

    ws.on('close', () => console.log('[WS] Client disconnected'));
    ws.on('error', (err) => { console.error('[WS] Error:', err.message); ws.close(); });
  });

  return wss;
}

function broadcast(type, data) {
  if (!wss) return;
  const msg = JSON.stringify({ type, data });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

function getVaultData(store) {
  const agents = store.getAgents();
  const totalBalance = agents.reduce((s, a) => s + a.current_balance, 0);
  const totalAllocated = agents.reduce((s, a) => s + a.allocated_funds, 0);
  const dailyPnl = agents.reduce((s, a) => s + a.daily_pnl, 0);
  const weeklyPnl = agents.reduce((s, a) => s + a.weekly_pnl, 0);
  const totalPnl = agents.reduce((s, a) => s + a.total_pnl, 0);
  const activeAgents = agents.filter(a => a.status === 'active' || a.status === 'executing').length;

  return {
    totalBalance,
    totalAllocated,
    dailyPnl,
    weeklyPnl,
    totalPnl,
    activeAgents,
    totalAgents: agents.length,
    roi: totalAllocated > 0 ? (totalPnl / totalAllocated) * 100 : 0
  };
}

function formatAgent(agent) {
  return {
    id: agent.id,
    name: agent.name,
    codename: agent.codename,
    status: agent.status,
    allocatedFunds: agent.allocated_funds,
    currentBalance: agent.current_balance,
    dailyPnl: agent.daily_pnl,
    weeklyPnl: agent.weekly_pnl,
    totalPnl: agent.total_pnl,
    winRate: agent.win_rate,
    totalTrades: agent.total_trades,
    todayTrades: agent.today_trades,
    openPositions: agent.open_positions,
    platform: agent.platform,
    accountId: agent.account_id,
    preferredMarket: agent.preferred_market,
    currentSymbol: agent.current_symbol,
    currentDirection: agent.current_direction,
    chartData: JSON.parse(agent.chart_data || '[]'),
    agentColor: agent.agent_color,
    createdAt: agent.created_at
  };
}

function formatTrade(trade) {
  return {
    id: trade.id,
    agentId: trade.agent_id,
    agentCodename: trade.agent_codename || '',
    agentColor: trade.agent_color || '',
    symbol: trade.symbol,
    direction: trade.direction,
    entryPrice: trade.entry_price,
    exitPrice: trade.exit_price,
    quantity: trade.quantity,
    pnl: trade.pnl,
    status: trade.status,
    platform: trade.platform,
    openedAt: trade.opened_at,
    closedAt: trade.closed_at
  };
}

module.exports = { setupWebSocket, broadcast, getVaultData, formatAgent, formatTrade };
