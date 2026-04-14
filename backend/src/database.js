const { DataStore } = require('./store');

function generateInitialChart() {
  const points = [];
  let price = 1.1 + Math.random() * 0.1;
  for (let i = 0; i < 30; i++) {
    price += (Math.random() - 0.48) * 0.002;
    points.push(parseFloat(price.toFixed(5)));
  }
  return points;
}

function initDatabase() {
  const store = new DataStore();

  // Seed agents if empty
  if (store.getAgents().length === 0) {
    const agents = [
      { name: 'Agent Viper',   codename: 'VIPER',   status: 'active',   allocated_funds: 25000, current_balance: 25000, win_rate: 0.68, platform: 'simulator', preferred_market: 'forex',    agent_color: '#00ff41' },
      { name: 'Agent Ghost',   codename: 'GHOST',   status: 'active',   allocated_funds: 30000, current_balance: 30000, win_rate: 0.72, platform: 'simulator', preferred_market: 'stocks',   agent_color: '#00a8ff' },
      { name: 'Agent Phantom', codename: 'PHANTOM', status: 'standby',  allocated_funds: 20000, current_balance: 20000, win_rate: 0.61, platform: 'simulator', preferred_market: 'crypto',   agent_color: '#9d4edd' },
      { name: 'Agent Cobra',   codename: 'COBRA',   status: 'active',   allocated_funds: 15000, current_balance: 15000, win_rate: 0.75, platform: 'simulator', preferred_market: 'futures',  agent_color: '#ffd700' },
      { name: 'Agent Shadow',  codename: 'SHADOW',  status: 'standby',  allocated_funds: 18000, current_balance: 18000, win_rate: 0.58, platform: 'simulator', preferred_market: 'crypto',   agent_color: '#ff6b35' },
      { name: 'Agent Cipher',  codename: 'CIPHER',  status: 'active',   allocated_funds: 22000, current_balance: 22000, win_rate: 0.70, platform: 'simulator', preferred_market: 'forex',    agent_color: '#ff4d6d' }
    ];
    for (const a of agents) {
      store.insertAgent({ ...a, chart_data: JSON.stringify(generateInitialChart()) });
    }
  }

  // Seed connections if empty
  if (store.getConnections().length === 0) {
    store.upsertConnection('ninjatrader', {
      status: 'disconnected',
      config: JSON.stringify({ host: 'localhost', port: 8080, username: '', password: '' })
    });
    store.upsertConnection('tradingview', {
      status: 'disconnected',
      config: JSON.stringify({ webhookSecret: '', allowedIPs: [] })
    });
  }

  return store;
}

module.exports = { initDatabase };
