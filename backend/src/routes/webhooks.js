const express = require('express');
const router = express.Router();
const { broadcast, getVaultData, formatAgent, formatTrade } = require('../websocket');

router.post('/tradingview', (req, res) => {
  const { agentId, secret, symbol, direction, price, pnl, action } = req.body;

  const conn = req.store.getConnection('tradingview');
  if (conn) {
    const cfg = JSON.parse(conn.config || '{}');
    if (cfg.webhookSecret && cfg.webhookSecret !== secret) {
      return res.status(401).json({ error: 'Invalid webhook secret' });
    }
  }

  const agent = req.store.getAgent(agentId);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  req.store.upsertConnection('tradingview', { status: 'connected', last_sync: new Date().toISOString() });
  broadcast('CONNECTION_STATUS', { platform: 'tradingview', status: 'connected' });

  if (action === 'trade' || action === 'close') {
    const tradePnl = pnl || 0;
    const trade = req.store.insertTrade({
      agent_id: agentId,
      symbol,
      direction: direction === 'buy' ? 'long' : 'short',
      entry_price: price || 0,
      exit_price:  price || 0,
      pnl: tradePnl,
      status: 'closed',
      platform: 'tradingview'
    });

    const stats = req.store.getTradeStats(agentId);
    req.store.updateAgent(agentId, {
      current_balance: agent.current_balance + tradePnl,
      daily_pnl:       agent.daily_pnl       + tradePnl,
      total_pnl:       agent.total_pnl        + tradePnl,
      total_trades:    agent.total_trades + 1,
      today_trades:    agent.today_trades + 1,
      win_rate:        stats.winRate,
      current_symbol:  symbol,
      status:          'active',
      open_positions:  0,
      platform:        'tradingview'
    });

    const updatedAgent = req.store.getAgent(agentId);
    const tradeWithAgent = { ...trade, agent_codename: agent.codename, agent_color: agent.agent_color };

    broadcast('AGENT_UPDATE',   { agent: formatAgent(updatedAgent) });
    broadcast('TRADE_EXECUTED', { trade: formatTrade(tradeWithAgent) });
    broadcast('VAULT_UPDATE',   { vault: getVaultData(req.store) });

  } else if (action === 'open') {
    req.store.updateAgent(agentId, {
      current_symbol:    symbol,
      current_direction: direction === 'buy' ? 'long' : 'short',
      open_positions: 1,
      status: 'executing',
      platform: 'tradingview'
    });
    broadcast('AGENT_UPDATE', { agent: formatAgent(req.store.getAgent(agentId)) });
  }

  res.json({ success: true, agentId, action });
});

router.post('/ninjatrader', (req, res) => {
  const { agentId, secret, type, data } = req.body;

  const conn = req.store.getConnection('ninjatrader');
  if (conn) {
    const cfg = JSON.parse(conn.config || '{}');
    if (cfg.webhookSecret && cfg.webhookSecret !== secret) {
      return res.status(401).json({ error: 'Invalid webhook secret' });
    }
  }

  req.store.upsertConnection('ninjatrader', { status: 'connected', last_sync: new Date().toISOString() });
  broadcast('CONNECTION_STATUS', { platform: 'ninjatrader', status: 'connected' });

  if (type === 'trade' && data) {
    const agents = req.store.getAgents();
    const agent = agentId
      ? req.store.getAgent(agentId)
      : agents.find(a => a.platform === 'ninjatrader') || agents[0];

    if (agent) {
      const tradePnl = data.realizedPnl || 0;
      const trade = req.store.insertTrade({
        agent_id:    agent.id,
        symbol:      data.instrument || '',
        direction:   data.action === 'Buy' ? 'long' : 'short',
        entry_price: data.avgFillPrice || 0,
        exit_price:  data.avgFillPrice || 0,
        pnl:         tradePnl,
        status:      'closed',
        platform:    'ninjatrader',
        opened_at:   data.time || new Date().toISOString()
      });

      req.store.updateAgent(agent.id, {
        current_balance: agent.current_balance + tradePnl,
        daily_pnl:       agent.daily_pnl       + tradePnl,
        total_pnl:       agent.total_pnl        + tradePnl,
        total_trades:    agent.total_trades + 1,
        platform:        'ninjatrader'
      });

      const tradeWithAgent = { ...trade, agent_codename: agent.codename, agent_color: agent.agent_color };
      broadcast('AGENT_UPDATE',   { agent: formatAgent(req.store.getAgent(agent.id)) });
      broadcast('TRADE_EXECUTED', { trade: formatTrade(tradeWithAgent) });
      broadcast('VAULT_UPDATE',   { vault: getVaultData(req.store) });
    }
  }

  res.json({ success: true });
});

module.exports = router;
