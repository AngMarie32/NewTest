export interface Agent {
  id: number;
  name: string;
  codename: string;
  status: 'active' | 'standby' | 'executing' | 'offline';
  allocatedFunds: number;
  currentBalance: number;
  dailyPnl: number;
  weeklyPnl: number;
  totalPnl: number;
  winRate: number;
  totalTrades: number;
  todayTrades: number;
  openPositions: number;
  platform: 'ninjatrader' | 'tradingview' | 'simulator';
  accountId: string;
  preferredMarket: 'forex' | 'stocks' | 'crypto' | 'futures';
  currentSymbol: string;
  currentDirection: string;
  chartData: number[];
  agentColor: string;
  createdAt: string;
}

export interface Trade {
  id: number;
  agentId: number;
  agentCodename: string;
  agentColor?: string;
  symbol: string;
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  status: 'open' | 'closed';
  platform: string;
  openedAt: string;
  closedAt: string;
}

export interface VaultData {
  totalBalance: number;
  totalAllocated: number;
  dailyPnl: number;
  weeklyPnl: number;
  totalPnl: number;
  activeAgents: number;
  totalAgents: number;
  roi: number;
}

export interface Connection {
  id: number;
  platform: string;
  status: 'connected' | 'disconnected' | 'connecting';
  config: Record<string, unknown>;
  lastSync: string | null;
  webhookSecret: string;
}

export interface WSMessage {
  type:
    | 'INIT'
    | 'AGENT_UPDATE'
    | 'TRADE_EXECUTED'
    | 'VAULT_UPDATE'
    | 'CONNECTION_STATUS'
    | 'PONG';
  data: {
    agents?: Agent[];
    agent?: Agent;
    vault?: VaultData;
    trades?: Trade[];
    trade?: Trade;
    connections?: Connection[];
    platform?: string;
    status?: string;
    accounts?: unknown[];
  };
}

export interface SettingsState {
  open: boolean;
  agentId: number | null;
  activeTab: 'funds' | 'agent' | 'connections';
}
