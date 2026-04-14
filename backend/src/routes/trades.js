const express = require('express');
const router = express.Router();

// GET recent trades
router.get('/', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const agentId = req.query.agentId;
  const platform = req.query.platform;

  let query = `
    SELECT t.*, a.codename as agent_codename, a.agent_color
    FROM trades t
    JOIN agents a ON t.agent_id = a.id
    WHERE 1=1
  `;
  const params = [];

  if (agentId) {
    query += ' AND t.agent_id = ?';
    params.push(agentId);
  }

  if (platform) {
    query += ' AND t.platform = ?';
    params.push(platform);
  }

  query += ' ORDER BY t.opened_at DESC LIMIT ?';
  params.push(limit);

  const trades = req.db.prepare(query).all(...params);
  res.json(trades.map(t => ({
    id: t.id,
    agentId: t.agent_id,
    agentCodename: t.agent_codename,
    agentColor: t.agent_color,
    symbol: t.symbol,
    direction: t.direction,
    entryPrice: t.entry_price,
    exitPrice: t.exit_price,
    quantity: t.quantity,
    pnl: t.pnl,
    status: t.status,
    platform: t.platform,
    openedAt: t.opened_at,
    closedAt: t.closed_at
  })));
});

// GET trade stats summary
router.get('/stats', (req, res) => {
  const agentId = req.query.agentId;
  let where = agentId ? `WHERE agent_id = ${parseInt(agentId)}` : '';

  const stats = req.db.prepare(`
    SELECT
      COUNT(*) as totalTrades,
      SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN pnl < 0 THEN 1 ELSE 0 END) as losses,
      SUM(pnl) as totalPnl,
      AVG(CASE WHEN pnl > 0 THEN pnl END) as avgWin,
      AVG(CASE WHEN pnl < 0 THEN pnl END) as avgLoss,
      MAX(pnl) as bestTrade,
      MIN(pnl) as worstTrade
    FROM trades ${where}
  `).get();

  res.json({
    ...stats,
    winRate: stats.totalTrades > 0 ? stats.wins / stats.totalTrades : 0
  });
});

module.exports = router;
