import { isBreakEven, type Trade } from './trade';

export interface StatsInput {
  trades: readonly Trade[];
  initialBalance: number;
  today: string;
}

export interface Stats {
  totalTrades: number;
  wins: number;
  losses: number;
  breakEvens: number;
  winRate: number;
  totalPnl: number;
  balance: number;
  returnPct: number;
  profitFactor: number;
  maxWin: number;
  maxLoss: number;
  buyCount: number;
  sellCount: number;
  todayCount: number;
  /** Operações de hoje que contam para o limite diário (break even não conta). */
  todayCountedTrades: number;
}

export function calculateStats(input: StatsInput): Stats {
  const { trades, initialBalance, today } = input;

  let wins = 0;
  let losses = 0;
  let breakEvens = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let totalPnl = 0;
  let maxWin = 0;
  let maxLoss = 0;
  let buyCount = 0;
  let sellCount = 0;
  let todayCount = 0;
  let todayCountedTrades = 0;

  for (const trade of trades) {
    totalPnl += trade.pnl;

    if (trade.type === 'Compra') buyCount += 1;
    else sellCount += 1;

    if (trade.date === today) {
      todayCount += 1;
      if (!isBreakEven(trade.pnl)) todayCountedTrades += 1;
    }

    if (isBreakEven(trade.pnl)) {
      breakEvens += 1;
      continue;
    }

    if (trade.pnl > 0) {
      wins += 1;
      grossProfit += trade.pnl;
      if (trade.pnl > maxWin) maxWin = trade.pnl;
    } else {
      losses += 1;
      grossLoss += Math.abs(trade.pnl);
      if (trade.pnl < maxLoss) maxLoss = trade.pnl;
    }
  }

  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Number.POSITIVE_INFINITY : 0;

  return {
    totalTrades: trades.length,
    wins,
    losses,
    breakEvens,
    winRate: trades.length > 0 ? (wins / trades.length) * 100 : 0,
    totalPnl,
    balance: initialBalance + totalPnl,
    returnPct: initialBalance > 0 ? (totalPnl / initialBalance) * 100 : 0,
    profitFactor,
    maxWin,
    maxLoss,
    buyCount,
    sellCount,
    todayCount,
    todayCountedTrades,
  };
}
