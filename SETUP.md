# Free Agent Trader Vault — Setup Guide

## Quick Start

```bash
# Install all dependencies
npm run install:all

# Start both backend and frontend (dev mode)
npm run dev
```

Then open: http://localhost:5173

---

## NinjaTrader 8 Integration

### Enable the NT8 HTTP Server
1. Open NinjaTrader 8
2. Go to **Tools → Options → NinjaScript**
3. Enable **"HTTP Server"** and set port to `8080`
4. Restart NinjaTrader

### Connect in the Dashboard
1. Click **SETTINGS** → **CONNECTIONS** tab
2. Enter Host: `localhost`, Port: `8080`
3. Click **CONNECT NINJA TRADER**
4. Assign an agent to the `ninjatrader` platform in the AGENT CFG tab

### Push trade data from NinjaScript (optional)
Add to your NinjaScript strategy's `OnExecutionUpdate()`:
```csharp
using (var client = new System.Net.Http.HttpClient()) {
    var data = new {
        agentId = 1,  // Your agent ID
        secret = "your-secret",
        type = "trade",
        data = new {
            instrument = execution.Instrument.FullName,
            action = execution.Entry.Direction.ToString(),
            avgFillPrice = execution.Price,
            realizedPnl = SystemPerformance.AllTrades.TradesPerformance.Currency.CumProfit,
            time = DateTime.Now.ToString("o")
        }
    };
    var json = System.Text.Json.JsonSerializer.Serialize(data);
    var content = new System.Net.Http.StringContent(json, Encoding.UTF8, "application/json");
    client.PostAsync("http://localhost:3001/api/webhooks/ninjatrader", content).Wait();
}
```

---

## TradingView Integration

TradingView requires a **Pro+ subscription** for webhook alerts.

### Setup
1. Click **SETTINGS** → **CONNECTIONS** tab
2. Set a Webhook Secret (optional but recommended)
3. In TradingView, create an alert on your strategy
4. Under notifications, enable **Webhook URL**
5. For local testing use [ngrok](https://ngrok.com): `ngrok http 3001`
6. Set webhook URL to: `http://your-ngrok-url/api/webhooks/tradingview`

### Alert Message Format (JSON)
```json
{
  "agentId": 1,
  "secret": "your-secret",
  "symbol": "{{ticker}}",
  "direction": "{{strategy.order.action}}",
  "price": {{close}},
  "pnl": {{strategy.netprofit}},
  "action": "trade"
}
```

Actions: `"trade"` (closed trade), `"open"` (position opened), `"close"` (position closed)

---

## Architecture

```
backend/     Express + SQLite + WebSocket (port 3001)
frontend/    React + Vite + TypeScript (port 5173)
data/        SQLite database (auto-created)
```

### API Endpoints
- `GET  /api/agents` — All agents
- `POST /api/agents/:id/funds` — Add/remove/set agent funds
- `PUT  /api/agents/:id` — Update agent config
- `GET  /api/vault` — Vault totals
- `GET  /api/trades` — Trade history
- `POST /api/webhooks/tradingview` — TradingView webhook receiver
- `POST /api/webhooks/ninjatrader` — NinjaTrader push webhook
- `POST /api/connections/ninjatrader` — Configure NT8 connection
- `POST /api/connections/tradingview` — Configure TV webhooks

### WebSocket Messages
Connect to `ws://localhost:3001` for real-time updates:
- `INIT` — Full initial state
- `AGENT_UPDATE` — Single agent changed
- `TRADE_EXECUTED` — New trade closed
- `VAULT_UPDATE` — Vault totals changed
- `CONNECTION_STATUS` — Broker connection status

---

## Simulator Mode

All agents run in **simulator mode** by default. The simulator:
- Generates realistic trades every 1–3 minutes per agent
- Uses real instrument names (EUR/USD, SPY, BTC/USD, ES futures, etc.)
- Applies win rates per agent (58%–75%)
- Updates the vault in real-time
- Resets daily P&L at midnight

To disable simulation for an agent, change its platform to `ninjatrader` or `tradingview` in settings.
