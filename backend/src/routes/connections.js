const express = require('express');
const router = express.Router();
const { connectNinjaTrader } = require('../services/ninjatrader');
const { broadcast } = require('../websocket');

// GET all connections
router.get('/', (req, res) => {
  const connections = req.db.prepare('SELECT * FROM connections').all().map(c => ({
    ...c,
    config: JSON.parse(c.config || '{}')
  }));
  res.json(connections);
});

// POST connect NinjaTrader
router.post('/ninjatrader', async (req, res) => {
  const { host, port, username, password } = req.body;

  const config = {
    host: host || 'localhost',
    port: port || 8080,
    username: username || '',
    password: password || ''
  };

  req.db.prepare(`
    UPDATE connections SET config = ?, status = 'connecting' WHERE platform = 'ninjatrader'
  `).run(JSON.stringify(config));

  const connected = await connectNinjaTrader(config);

  const conn = req.db.prepare("SELECT * FROM connections WHERE platform = 'ninjatrader'").get();
  res.json({ success: connected, connection: { ...conn, config } });
});

// POST configure TradingView
router.post('/tradingview', (req, res) => {
  const { webhookSecret, allowedIPs } = req.body;

  const config = {
    webhookSecret: webhookSecret || '',
    allowedIPs: allowedIPs || []
  };

  req.db.prepare(`
    UPDATE connections SET config = ? WHERE platform = 'tradingview'
  `).run(JSON.stringify(config));

  // The webhook endpoint is already active
  const webhookUrl = `http://localhost:3001/api/webhooks/tradingview`;

  res.json({
    success: true,
    webhookUrl,
    instructions: {
      step1: 'In TradingView, open your Pine Script strategy',
      step2: 'Add alert with webhook URL above',
      step3: 'Use JSON message format:',
      messageFormat: {
        agentId: 1,
        secret: webhookSecret || 'your-secret',
        symbol: '{{ticker}}',
        direction: '{{strategy.order.action}}',
        price: '{{close}}',
        pnl: '{{strategy.netprofit}}',
        action: 'trade'
      },
      ntScript: `// NinjaTrader NinjaScript - add to your strategy:
// In OnExecutionUpdate():
using (var client = new System.Net.Http.HttpClient()) {
  var data = new {
    agentId = 1,
    secret = "your-secret",
    type = "trade",
    data = new {
      instrument = execution.Instrument.FullName,
      action = execution.Entry.Direction.ToString(),
      avgFillPrice = execution.Price,
      realizedPnl = SystemPerformance.AllTrades.TradesPerformance.Currency.CumProfit,
      time = DateTime.Now.ToString("o")
    }
  };
  var json = System.Text.Json.JsonSerializer.Serialize(data);
  var content = new System.Net.Http.StringContent(json, System.Text.Encoding.UTF8, "application/json");
  client.PostAsync("http://localhost:3001/api/webhooks/ninjatrader", content).Wait();
}`
    }
  });
});

// POST disconnect a platform
router.post('/:platform/disconnect', (req, res) => {
  const { platform } = req.params;

  req.db.prepare("UPDATE connections SET status = 'disconnected' WHERE platform = ?").run(platform);
  broadcast('CONNECTION_STATUS', { platform, status: 'disconnected' });

  res.json({ success: true, platform, status: 'disconnected' });
});

// GET connection status
router.get('/:platform/status', (req, res) => {
  const conn = req.db.prepare('SELECT * FROM connections WHERE platform = ?').get(req.params.platform);
  if (!conn) return res.status(404).json({ error: 'Connection not found' });

  res.json({
    platform: conn.platform,
    status: conn.status,
    lastSync: conn.last_sync
  });
});

module.exports = router;
