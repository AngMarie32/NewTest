const express = require('express');
const router = express.Router();
const { broadcast, getVaultData, formatAgent } = require('../websocket');

router.get('/', (req, res) => {
  res.json(req.store.getAgents().map(formatAgent));
});

router.get('/:id', (req, res) => {
  const agent = req.store.getAgent(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(formatAgent(agent));
});

router.post('/:id/funds', (req, res) => {
  const { amount, action } = req.body;
  if (typeof amount !== 'number' || amount < 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const agent = req.store.getAgent(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  let newAllocated, newBalance;
  if (action === 'set') {
    newAllocated = amount;
    newBalance = amount + (agent.current_balance - agent.allocated_funds);
  } else if (action === 'remove') {
    newAllocated = Math.max(0, agent.allocated_funds - amount);
    newBalance   = Math.max(0, agent.current_balance  - amount);
  } else {
    newAllocated = agent.allocated_funds + amount;
    newBalance   = agent.current_balance  + amount;
  }

  req.store.updateAgent(req.params.id, { allocated_funds: newAllocated, current_balance: newBalance });

  const updated = formatAgent(req.store.getAgent(req.params.id));
  broadcast('AGENT_UPDATE', { agent: updated });
  broadcast('VAULT_UPDATE',  { vault: getVaultData(req.store) });
  res.json(updated);
});

router.put('/:id', (req, res) => {
  const { name, codename, status, platform, accountId, preferredMarket, agentColor } = req.body;
  const agent = req.store.getAgent(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  req.store.updateAgent(req.params.id, {
    ...(name           != null && { name }),
    ...(codename       != null && { codename: codename.toUpperCase() }),
    ...(status         != null && { status }),
    ...(platform       != null && { platform }),
    ...(accountId      != null && { account_id: accountId }),
    ...(preferredMarket != null && { preferred_market: preferredMarket }),
    ...(agentColor     != null && { agent_color: agentColor })
  });

  const updated = formatAgent(req.store.getAgent(req.params.id));
  broadcast('AGENT_UPDATE', { agent: updated });
  res.json(updated);
});

router.post('/', (req, res) => {
  const { name, codename, allocatedFunds, platform, preferredMarket, agentColor } = req.body;
  if (!name || !codename) return res.status(400).json({ error: 'Name and codename required' });

  const newAgent = req.store.insertAgent({
    name,
    codename: codename.toUpperCase(),
    allocated_funds: allocatedFunds || 10000,
    current_balance: allocatedFunds || 10000,
    platform: platform || 'simulator',
    preferred_market: preferredMarket || 'forex',
    agent_color: agentColor || '#00ff41',
    chart_data: '[]'
  });

  const formatted = formatAgent(newAgent);
  broadcast('AGENT_UPDATE', { agent: formatted });
  broadcast('VAULT_UPDATE',  { vault: getVaultData(req.store) });
  res.status(201).json(formatted);
});

router.delete('/:id', (req, res) => {
  if (!req.store.getAgent(req.params.id)) return res.status(404).json({ error: 'Agent not found' });
  req.store.deleteAgent(req.params.id);
  broadcast('VAULT_UPDATE', { vault: getVaultData(req.store) });
  res.json({ success: true });
});

module.exports = router;
