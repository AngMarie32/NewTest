const express = require('express');
const http = require('http');
const cors = require('cors');
const cron = require('node-cron');

const { initDatabase } = require('./database');
const { setupWebSocket, getVaultData } = require('./websocket');
const { startSimulator } = require('./services/simulator');
const ninjaTraderService = require('./services/ninjatrader');

const agentsRouter      = require('./routes/agents');
const vaultRouter       = require('./routes/vault');
const tradesRouter      = require('./routes/trades');
const webhooksRouter    = require('./routes/webhooks');
const connectionsRouter = require('./routes/connections');

const app    = express();
const server = http.createServer(app);

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Init data store (pure JSON — no native compilation needed)
const store = initDatabase();

// Attach store to every request
app.use((req, res, next) => { req.store = store; next(); });

app.use('/api/agents',      agentsRouter);
app.use('/api/vault',       vaultRouter);
app.use('/api/trades',      tradesRouter);
app.use('/api/webhooks',    webhooksRouter);
app.use('/api/connections', connectionsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'operational', timestamp: new Date().toISOString(), vault: getVaultData(store), uptime: process.uptime() });
});

setupWebSocket(server, store);
startSimulator(store);
ninjaTraderService.startPolling(store);

// Snapshot every 15 min
cron.schedule('*/15 * * * *', () => {
  const v = getVaultData(store);
  store.insertSnapshot({ total_balance: v.totalBalance, daily_pnl: v.dailyPnl, weekly_pnl: v.weeklyPnl, total_pnl: v.totalPnl });
});

// Reset daily stats at midnight
cron.schedule('0 0 * * *', () => {
  for (const agent of store.getAgents()) {
    store.updateAgent(agent.id, { daily_pnl: 0, today_trades: 0 });
  }
  console.log('[Server] Daily stats reset');
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║  🕵️  FREE AGENT TRADER VAULT - SERVER        ║
  ║  Status: OPERATIONAL                         ║
  ║  Port: ${PORT}                                   ║
  ║  WebSocket: ws://localhost:${PORT}               ║
  ║  API: http://localhost:${PORT}/api               ║
  ╚══════════════════════════════════════════════╝
  `);
});
