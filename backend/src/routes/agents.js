const express = require('express');
const router = express.Router();
const { broadcast, getVaultData, formatAgent } = require('../websocket');

// GET all agents
router.get('/', (req, res) => {
  const agents = req.db.prepare('SELECT * FROM agents ORDER BY id ASC').all();
  res.json(agents.map(formatAgent));
});

// GET single agent
router.get('/:id', (req, res) => {
  const agent = req.db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(formatAgent(agent));
});

// POST add/update funds for an agent
router.post('/:id/funds', (req, res) => {
  const { amount, action } = req.body; // action: 'add' | 'remove' | 'set'

  if (typeof amount !== 'number' || amount < 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const agent = req.db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  let newAllocated;
  let newBalance;

  if (action === 'set') {
    newAllocated = amount;
    newBalance = amount + (agent.current_balance - agent.allocated_funds);
  } else if (action === 'remove') {
    newAllocated = Math.max(0, agent.allocated_funds - amount);
    newBalance = Math.max(0, agent.current_balance - amount);
  } else {
    // add (default)
    newAllocated = agent.allocated_funds + amount;
    newBalance = agent.current_balance + amount;
  }

  req.db.prepare(`
    UPDATE agents SET allocated_funds = ?, current_balance = ? WHERE id = ?
  `).run(newAllocated, newBalance, req.params.id);

  const updated = req.db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
  const formattedAgent = formatAgent(updated);

  broadcast('AGENT_UPDATE', { agent: formattedAgent });
  broadcast('VAULT_UPDATE', { vault: getVaultData(req.db) });

  res.json(formattedAgent);
});

// PUT update agent settings
router.put('/:id', (req, res) => {
  const { name, codename, status, platform, accountId, preferredMarket, agentColor } = req.body;

  const agent = req.db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  req.db.prepare(`
    UPDATE agents SET
      name = COALESCE(?, name),
      codename = COALESCE(?, codename),
      status = COALESCE(?, status),
      platform = COALESCE(?, platform),
      account_id = COALESCE(?, account_id),
      preferred_market = COALESCE(?, preferred_market),
      agent_color = COALESCE(?, agent_color)
    WHERE id = ?
  `).run(name, codename, status, platform, accountId, preferredMarket, agentColor, req.params.id);

  const updated = req.db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
  const formattedAgent = formatAgent(updated);

  broadcast('AGENT_UPDATE', { agent: formattedAgent });

  res.json(formattedAgent);
});

// POST create new agent
router.post('/', (req, res) => {
  const { name, codename, allocatedFunds, platform, preferredMarket, agentColor } = req.body;

  if (!name || !codename) {
    return res.status(400).json({ error: 'Name and codename are required' });
  }

  const result = req.db.prepare(`
    INSERT INTO agents (name, codename, allocated_funds, current_balance, platform, preferred_market, agent_color, chart_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name,
    codename.toUpperCase(),
    allocatedFunds || 10000,
    allocatedFunds || 10000,
    platform || 'simulator',
    preferredMarket || 'forex',
    agentColor || '#00ff41',
    JSON.stringify([])
  );

  const newAgent = req.db.prepare('SELECT * FROM agents WHERE id = ?').get(result.lastInsertRowid);
  const formattedAgent = formatAgent(newAgent);

  broadcast('AGENT_UPDATE', { agent: formattedAgent });
  broadcast('VAULT_UPDATE', { vault: getVaultData(req.db) });

  res.status(201).json(formattedAgent);
});

// DELETE agent
router.delete('/:id', (req, res) => {
  const agent = req.db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  req.db.prepare('DELETE FROM agents WHERE id = ?').run(req.params.id);
  broadcast('VAULT_UPDATE', { vault: getVaultData(req.db) });

  res.json({ success: true });
});

module.exports = router;
