const express = require('express');
const router = express.Router();
const { getVaultData } = require('../websocket');

// GET vault totals
router.get('/', (req, res) => {
  res.json(getVaultData(req.db));
});

// GET vault history (snapshots)
router.get('/history', (req, res) => {
  const hours = parseInt(req.query.hours) || 24;
  const snapshots = req.db.prepare(`
    SELECT * FROM vault_snapshots
    WHERE recorded_at > datetime('now', '-${hours} hours')
    ORDER BY recorded_at ASC
  `).all();
  res.json(snapshots);
});

// POST take a vault snapshot
router.post('/snapshot', (req, res) => {
  const vault = getVaultData(req.db);
  req.db.prepare(`
    INSERT INTO vault_snapshots (total_balance, daily_pnl, weekly_pnl, total_pnl)
    VALUES (?, ?, ?, ?)
  `).run(vault.totalBalance, vault.dailyPnl, vault.weeklyPnl, vault.totalPnl);
  res.json({ success: true, snapshot: vault });
});

module.exports = router;
