const express = require('express');
const http = require('http');
const cors = require('cors');
const cron = require('node-cron');

const { initDatabase } = require('./database');
const { setupWebSocket, getVaultData } = require('./websocket');
const { startSimulator } = require('./services/simulator');
const ninjaTraderService = require('./services/ninjatrader');

const agentsRouter = require('./routes/agents');
const vaultRouter = require('./routes/vault');
const tradesRouter = require('./routes/trades');
const webhooksRouter = require('./routes/webhooks');
const connectionsRouter = require('./routes/connections');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database
const db = initDatabase();

// Attach db to every request
app.use((req, res, next) => {
  req.db = db;
  next();
});

// API Routes
app.use('/api/agents', agentsRouter);
app.use('/api/vault', vaultRouter);
app.use('/api/trades', tradesRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/connections', connectionsRouter);

// Health check
app.get('/api/health', (req, res) => {
  const vault = getVaultData(db);
  res.json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    vault,
    uptime: process.uptime()
  });
});

// Setup WebSocket server
setupWebSocket(server, db);

// Start the trading simulator
startSimulator(db, null);

// Start NinjaTrader polling
ninjaTraderService.startPolling(db, null);

// Cron: Take vault snapshot every 15 minutes
cron.schedule('*/15 * * * *', () => {
  const vault = getVaultData(db);
  db.prepare(`
    INSERT INTO vault_snapshots (total_balance, daily_pnl, weekly_pnl, total_pnl)
    VALUES (?, ?, ?, ?)
  `).run(vault.totalBalance, vault.dailyPnl, vault.weeklyPnl, vault.totalPnl);
});

// Cron: Reset daily stats at midnight
cron.schedule('0 0 * * *', () => {
  db.prepare("UPDATE agents SET daily_pnl = 0, today_trades = 0").run();
  console.log('[Server] Daily stats reset at midnight');
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

module.exports = { app, server };
