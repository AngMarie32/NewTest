const WebSocket = require('ws');

let wss = null;

function setupWebSocket(server, db) {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    console.log('[WS] Client connected');

    // Send initial state
    try {
      const agents = db.prepare('SELECT * FROM agents').all();
      const vault = getVaultData(db);
      const trades = db.prepare(
        'SELECT t.*, a.codename as agent_codename FROM trades t JOIN agents a ON t.agent_id = a.id ORDER BY t.opened_at DESC LIMIT 50'
      ).all();
      const connections = db.prepare('SELECT * FROM connections').all().map(c => ({
        ...c,
        config: JSON.parse(c.config || '{}')
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
      console.error('[WS] Error sending init data:', err.message);
    }

    ws.on('message', (message) => {
      try {
        const msg = JSON.parse(message.toString());
        handleClientMessage(ws, db, msg);
      } catch (e) {
        // ignore
      }
    });

    ws.on('close', () => {
      console.log('[WS] Client disconnected');
    });

    ws.on('error', (err) => {
      console.error('[WS] Client error:', err.message);
    });
  });

  return wss;
}

function broadcast(type, data) {
  if (!wss) return;
  const message = JSON.stringify({ type, data });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function getVaultData(db) {
  const agents = db.prepare('SELECT * FROM agents').all();
  const totalBalance = agents.reduce((sum, a) => sum + a.current_balance, 0);
  const totalAllocated = agents.reduce((sum, a) => sum + a.allocated_funds, 0);
  const dailyPnl = agents.reduce((sum, a) => sum + a.daily_pnl, 0);
  const weeklyPnl = agents.reduce((sum, a) => sum + a.weekly_pnl, 0);
  const totalPnl = agents.reduce((sum, a) => sum + a.total_pnl, 0);
  const activeAgents = agents.filter(a => a.status === 'active').length;

  return {
    totalBalance,
    totalAllocated,
    dailyPnl,
    weeklyPnl,
    totalPnl,
    activeAgents,
    totalAgents: agents.length,
    roi: totalAllocated > 0 ? ((totalPnl / totalAllocated) * 100) : 0
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
    agentCodename: trade.agent_codename,
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

function handleClientMessage(ws, db, msg) {
  // Handle ping
  if (msg.type === 'PING') {
    ws.send(JSON.stringify({ type: 'PONG' }));
  }
}

module.exports = { setupWebSocket, broadcast, getVaultData, formatAgent, formatTrade };
