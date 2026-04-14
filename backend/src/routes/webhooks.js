/**
 * Webhook endpoints for TradingView and NinjaTrader
 *
 * TradingView Setup:
 * 1. Create an alert in TradingView
 * 2. Enable "Webhook URL" in the notification settings
 * 3. Set URL to: http://your-server:3001/api/webhooks/tradingview
 * 4. Set message format (JSON):
 *    {
 *      "agentId": 1,
 *      "secret": "your-webhook-secret",
 *      "symbol": "{{ticker}}",
 *      "direction": "{{strategy.order.action}}",
 *      "price": {{close}},
 *      "pnl": {{strategy.netprofit}},
 *      "action": "trade" | "open" | "close"
 *    }
 */

const express = require('express');
const router = express.Router();
const { broadcast, getVaultData, formatAgent, formatTrade } = require('../websocket');

// TradingView webhook
router.post('/tradingview', (req, res) => {
  const { agentId, secret, symbol, direction, price, pnl, action, quantity } = req.body;

  // Verify webhook secret
  const conn = req.db.prepare("SELECT * FROM connections WHERE platform = 'tradingview'").get();
  if (conn) {
    const config = JSON.parse(conn.config || '{}');
    if (config.webhookSecret && config.webhookSecret !== secret) {
      return res.status(401).json({ error: 'Invalid webhook secret' });
    }
  }

  const agent = req.db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  const now = new Date().toISOString();

  if (action === 'trade' || action === 'close') {
    // Record completed trade
    const tradeResult = req.db.prepare(`
      INSERT INTO trades (agent_id, symbol, direction, entry_price, exit_price, pnl, status, platform, opened_at, closed_at)
      VALUES (?, ?, ?, ?, ?, ?, 'closed', 'tradingview', ?, ?)
    `).run(agentId, symbol, direction === 'buy' ? 'long' : 'short', price, price, pnl || 0, now, now);

    // Update agent stats
    const newBalance = agent.current_balance + (pnl || 0);
    const newDailyPnl = agent.daily_pnl + (pnl || 0);
    const newTotalPnl = agent.total_pnl + (pnl || 0);
    const newTotalTrades = agent.total_trades + 1;
    const newTodayTrades = agent.today_trades + 1;

    const tradeStats = req.db.prepare(`
      SELECT COUNT(*) as total, SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as wins
      FROM trades WHERE agent_id = ?
    `).get(agentId);

    const newWinRate = tradeStats.total > 0 ? tradeStats.wins / tradeStats.total : agent.win_rate;

    req.db.prepare(`
      UPDATE agents SET
        current_balance = ?,
        daily_pnl = ?,
        total_pnl = ?,
        total_trades = ?,
        today_trades = ?,
        win_rate = ?,
        current_symbol = ?,
        status = 'active',
        open_positions = 0,
        platform = 'tradingview'
      WHERE id = ?
    `).run(newBalance, newDailyPnl, newTotalPnl, newTotalTrades, newTodayTrades, newWinRate, symbol, agentId);

    const updatedAgent = req.db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
    const trade = req.db.prepare(`
      SELECT t.*, a.codename as agent_codename FROM trades t JOIN agents a ON t.agent_id = a.id WHERE t.id = ?
    `).get(tradeResult.lastInsertRowid);

    // Update connection status
    req.db.prepare("UPDATE connections SET status = 'connected', last_sync = CURRENT_TIMESTAMP WHERE platform = 'tradingview'").run();

    broadcast('AGENT_UPDATE', { agent: formatAgent(updatedAgent) });
    broadcast('TRADE_EXECUTED', { trade: formatTrade(trade) });
    broadcast('VAULT_UPDATE', { vault: getVaultData(req.db) });
    broadcast('CONNECTION_STATUS', { platform: 'tradingview', status: 'connected' });

  } else if (action === 'open') {
    // Record open position
    req.db.prepare(`
      UPDATE agents SET
        current_symbol = ?,
        current_direction = ?,
        open_positions = 1,
        status = 'executing',
        platform = 'tradingview'
      WHERE id = ?
    `).run(symbol, direction === 'buy' ? 'long' : 'short', agentId);

    const updatedAgent = req.db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
    broadcast('AGENT_UPDATE', { agent: formatAgent(updatedAgent) });
  }

  res.json({ success: true, agentId, action });
});

// NinjaTrader webhook (for custom NT8 scripts that push data)
router.post('/ninjatrader', (req, res) => {
  const { agentId, secret, type, data } = req.body;

  const conn = req.db.prepare("SELECT * FROM connections WHERE platform = 'ninjatrader'").get();
  if (conn) {
    const config = JSON.parse(conn.config || '{}');
    if (config.webhookSecret && config.webhookSecret !== secret) {
      return res.status(401).json({ error: 'Invalid webhook secret' });
    }
  }

  // Update connection as active
  req.db.prepare("UPDATE connections SET status = 'connected', last_sync = CURRENT_TIMESTAMP WHERE platform = 'ninjatrader'").run();
  broadcast('CONNECTION_STATUS', { platform: 'ninjatrader', status: 'connected' });

  if (type === 'trade' && data) {
    // Process incoming trade from NT8
    const agent = agentId
      ? req.db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId)
      : req.db.prepare("SELECT * FROM agents WHERE platform = 'ninjatrader' LIMIT 1").get();

    if (agent) {
      const pnl = data.realizedPnl || 0;
      req.db.prepare(`
        INSERT INTO trades (agent_id, symbol, direction, entry_price, exit_price, pnl, status, platform, opened_at, closed_at)
        VALUES (?, ?, ?, ?, ?, ?, 'closed', 'ninjatrader', ?, CURRENT_TIMESTAMP)
      `).run(
        agent.id, data.instrument || '', data.action === 'Buy' ? 'long' : 'short',
        data.avgFillPrice || 0, data.avgFillPrice || 0, pnl,
        data.time || new Date().toISOString()
      );

      req.db.prepare(`
        UPDATE agents SET
          current_balance = current_balance + ?,
          daily_pnl = daily_pnl + ?,
          total_pnl = total_pnl + ?,
          total_trades = total_trades + 1,
          platform = 'ninjatrader'
        WHERE id = ?
      `).run(pnl, pnl, pnl, agent.id);

      const updatedAgent = req.db.prepare('SELECT * FROM agents WHERE id = ?').get(agent.id);
      broadcast('AGENT_UPDATE', { agent: formatAgent(updatedAgent) });
      broadcast('VAULT_UPDATE', { vault: getVaultData(req.db) });
    }
  }

  res.json({ success: true });
});

module.exports = router;
