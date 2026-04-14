const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/vault.db');

const fs = require('fs');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

function initDatabase() {
  const db = new Database(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      codename TEXT NOT NULL,
      status TEXT DEFAULT 'standby',
      allocated_funds REAL DEFAULT 10000,
      current_balance REAL DEFAULT 10000,
      daily_pnl REAL DEFAULT 0,
      weekly_pnl REAL DEFAULT 0,
      total_pnl REAL DEFAULT 0,
      win_rate REAL DEFAULT 0.65,
      total_trades INTEGER DEFAULT 0,
      today_trades INTEGER DEFAULT 0,
      open_positions INTEGER DEFAULT 0,
      platform TEXT DEFAULT 'simulator',
      account_id TEXT DEFAULT '',
      preferred_market TEXT DEFAULT 'forex',
      current_symbol TEXT DEFAULT '',
      current_direction TEXT DEFAULT '',
      chart_data TEXT DEFAULT '[]',
      agent_color TEXT DEFAULT '#00ff41',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      direction TEXT NOT NULL,
      entry_price REAL,
      exit_price REAL,
      quantity REAL DEFAULT 1,
      pnl REAL DEFAULT 0,
      status TEXT DEFAULT 'open',
      platform TEXT DEFAULT 'simulator',
      opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS vault_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total_balance REAL DEFAULT 0,
      daily_pnl REAL DEFAULT 0,
      weekly_pnl REAL DEFAULT 0,
      total_pnl REAL DEFAULT 0,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL UNIQUE,
      status TEXT DEFAULT 'disconnected',
      config TEXT DEFAULT '{}',
      last_sync DATETIME,
      webhook_secret TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed agents if table is empty
  const agentCount = db.prepare('SELECT COUNT(*) as count FROM agents').get();
  if (agentCount.count === 0) {
    seedAgents(db);
  }

  // Seed connections
  const connCount = db.prepare('SELECT COUNT(*) as count FROM connections').get();
  if (connCount.count === 0) {
    seedConnections(db);
  }

  return db;
}

function seedAgents(db) {
  const agents = [
    {
      name: 'Agent Viper',
      codename: 'VIPER',
      status: 'active',
      allocated_funds: 25000,
      current_balance: 25000,
      win_rate: 0.68,
      platform: 'simulator',
      preferred_market: 'forex',
      agent_color: '#00ff41',
      chart_data: JSON.stringify(generateInitialChart())
    },
    {
      name: 'Agent Ghost',
      codename: 'GHOST',
      status: 'active',
      allocated_funds: 30000,
      current_balance: 30000,
      win_rate: 0.72,
      platform: 'simulator',
      preferred_market: 'stocks',
      agent_color: '#00a8ff',
      chart_data: JSON.stringify(generateInitialChart())
    },
    {
      name: 'Agent Phantom',
      codename: 'PHANTOM',
      status: 'standby',
      allocated_funds: 20000,
      current_balance: 20000,
      win_rate: 0.61,
      platform: 'simulator',
      preferred_market: 'crypto',
      agent_color: '#9d4edd',
      chart_data: JSON.stringify(generateInitialChart())
    },
    {
      name: 'Agent Cobra',
      codename: 'COBRA',
      status: 'active',
      allocated_funds: 15000,
      current_balance: 15000,
      win_rate: 0.75,
      platform: 'simulator',
      preferred_market: 'futures',
      agent_color: '#ffd700',
      chart_data: JSON.stringify(generateInitialChart())
    },
    {
      name: 'Agent Shadow',
      codename: 'SHADOW',
      status: 'standby',
      allocated_funds: 18000,
      current_balance: 18000,
      win_rate: 0.58,
      platform: 'simulator',
      preferred_market: 'crypto',
      agent_color: '#ff6b35',
      chart_data: JSON.stringify(generateInitialChart())
    },
    {
      name: 'Agent Cipher',
      codename: 'CIPHER',
      status: 'active',
      allocated_funds: 22000,
      current_balance: 22000,
      win_rate: 0.70,
      platform: 'simulator',
      preferred_market: 'forex',
      agent_color: '#ff4d6d',
      chart_data: JSON.stringify(generateInitialChart())
    }
  ];

  const insertAgent = db.prepare(`
    INSERT INTO agents (name, codename, status, allocated_funds, current_balance,
      win_rate, platform, preferred_market, agent_color, chart_data)
    VALUES (@name, @codename, @status, @allocated_funds, @current_balance,
      @win_rate, @platform, @preferred_market, @agent_color, @chart_data)
  `);

  for (const agent of agents) {
    insertAgent.run(agent);
  }
}

function seedConnections(db) {
  const insertConn = db.prepare(`
    INSERT INTO connections (platform, status, config)
    VALUES (?, ?, ?)
  `);

  insertConn.run('ninjatrader', 'disconnected', JSON.stringify({
    host: 'localhost',
    port: 8080,
    username: '',
    password: ''
  }));

  insertConn.run('tradingview', 'disconnected', JSON.stringify({
    webhookSecret: '',
    allowedIPs: []
  }));
}

function generateInitialChart() {
  const points = [];
  let price = 1.1000 + Math.random() * 0.1;
  for (let i = 0; i < 30; i++) {
    price += (Math.random() - 0.48) * 0.002;
    points.push(parseFloat(price.toFixed(5)));
  }
  return points;
}

module.exports = { initDatabase };
