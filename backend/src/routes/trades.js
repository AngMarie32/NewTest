const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  const limit  = parseInt(req.query.limit)  || 100;
  const agentId = req.query.agentId ? Number(req.query.agentId) : undefined;
  const platform = req.query.platform;

  const trades = req.store.getTrades({ agentId, platform, limit });
  res.json(trades.map(t => ({
    id:            t.id,
    agentId:       t.agent_id,
    agentCodename: t.agent_codename || '',
    agentColor:    t.agent_color    || '',
    symbol:        t.symbol,
    direction:     t.direction,
    entryPrice:    t.entry_price,
    exitPrice:     t.exit_price,
    quantity:      t.quantity,
    pnl:           t.pnl,
    status:        t.status,
    platform:      t.platform,
    openedAt:      t.opened_at,
    closedAt:      t.closed_at
  })));
});

router.get('/stats', (req, res) => {
  const agentId = req.query.agentId ? Number(req.query.agentId) : undefined;
  res.json(req.store.getTradeStats(agentId));
});

module.exports = router;
