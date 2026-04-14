const express = require('express');
const router = express.Router();
const { getVaultData } = require('../websocket');

router.get('/', (req, res) => {
  res.json(getVaultData(req.store));
});

router.get('/history', (req, res) => {
  const hours = parseInt(req.query.hours) || 24;
  res.json(req.store.getSnapshots(hours));
});

router.post('/snapshot', (req, res) => {
  const vault = getVaultData(req.store);
  req.store.insertSnapshot({
    total_balance: vault.totalBalance,
    daily_pnl: vault.dailyPnl,
    weekly_pnl: vault.weeklyPnl,
    total_pnl: vault.totalPnl
  });
  res.json({ success: true, snapshot: vault });
});

module.exports = router;
