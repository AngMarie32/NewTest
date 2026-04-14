const express = require('express');
const router = express.Router();
const { connectNinjaTrader } = require('../services/ninjatrader');
const { broadcast } = require('../websocket');

router.get('/', (req, res) => {
  const connections = req.store.getConnections().map(c => ({
    ...c, config: JSON.parse(c.config || '{}')
  }));
  res.json(connections);
});

router.post('/ninjatrader', async (req, res) => {
  const { host, port, username, password } = req.body;
  const config = { host: host || 'localhost', port: port || 8080, username: username || '', password: password || '' };

  req.store.upsertConnection('ninjatrader', { status: 'connecting', config: JSON.stringify(config) });

  const connected = await connectNinjaTrader(config, req.store);
  const conn = req.store.getConnection('ninjatrader');
  res.json({ success: connected, connection: { ...conn, config } });
});

router.post('/tradingview', (req, res) => {
  const { webhookSecret, allowedIPs } = req.body;
  const config = { webhookSecret: webhookSecret || '', allowedIPs: allowedIPs || [] };

  req.store.upsertConnection('tradingview', { config: JSON.stringify(config) });

  res.json({
    success: true,
    webhookUrl: 'http://localhost:3001/api/webhooks/tradingview',
    instructions: {
      step1: 'In TradingView, open your Pine Script strategy',
      step2: 'Add alert with the webhook URL above',
      step3: 'JSON message format:',
      messageFormat: {
        agentId: 1,
        secret: webhookSecret || 'your-secret',
        symbol: '{{ticker}}',
        direction: '{{strategy.order.action}}',
        price: '{{close}}',
        pnl: '{{strategy.netprofit}}',
        action: 'trade'
      }
    }
  });
});

router.post('/:platform/disconnect', (req, res) => {
  req.store.upsertConnection(req.params.platform, { status: 'disconnected' });
  broadcast('CONNECTION_STATUS', { platform: req.params.platform, status: 'disconnected' });
  res.json({ success: true });
});

router.get('/:platform/status', (req, res) => {
  const conn = req.store.getConnection(req.params.platform);
  if (!conn) return res.status(404).json({ error: 'Not found' });
  res.json({ platform: conn.platform, status: conn.status, lastSync: conn.last_sync });
});

module.exports = router;
