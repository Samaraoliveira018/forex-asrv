import { isBreakEven, isStop, type Trade, type TradeSession } from './trade';

export interface StatsInput {
  trades: readonly Trade[];
  initialBalance: number;
  today: string;
}

/** Resultado de um período (dia, semana ou mês) com % sobre o saldo de abertura. */
export interface PeriodResult {
  pnl: number;
  openingBalance: number;
  /** Resultado do período em % do saldo de abertura (pode ser negativo). */
  pct: number;
  /** Percentual perdido no período (0 quando o período não fechou negativo). */
  lossPct: number;
  trades: number;
  stops: number;
}

export interface PeriodResults {
  daily: PeriodResult;
  weekly: PeriodResult;
  monthly: PeriodResult;
}

/** Contadores de disciplina de uma sessão no dia atual. */
export interface SessionCounters {
  /** Operações da sessão que contam para o limite (break even não conta). */
  countedTrades: number;
  /** Stops (perdas reais) da sessão. */
  stops: number;
  /** Total de operações registradas na sessão, incluindo break even. */
  totalTrades: number;
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
  /** Operações de hoje que contam para o limite da sessão (break even não conta). */
  todayCountedTrades: number;
  /** Stops de hoje (perdas reais), somando dia e noite. */
  todayStops: number;
  /** Contadores de hoje separados por sessão (dia/noite). */
  todayBySession: Record<TradeSession, SessionCounters>;
  /** Resultado diário, semanal (desde segunda) e mensal. */
  periods: PeriodResults;
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
  let todayStops = 0;
  const todayBySession: Record<TradeSession, SessionCounters> = {
    day: { countedTrades: 0, stops: 0, totalTrades: 0 },
    night: { countedTrades: 0, stops: 0, totalTrades: 0 },
  };

  for (const trade of trades) {
    totalPnl += trade.pnl;

    if (trade.type === 'Compra') buyCount += 1;
    else sellCount += 1;

    if (trade.date === today) {
      todayCount += 1;
      if (!isBreakEven(trade.pnl)) todayCountedTrades += 1;
      if (isStop(trade.pnl)) todayStops += 1;

      const counters = todayBySession[trade.session];
      counters.totalTrades += 1;
      if (!isBreakEven(trade.pnl)) counters.countedTrades += 1;
      if (isStop(trade.pnl)) counters.stops += 1;
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
    todayStops,
    todayBySession,
    periods: calculatePeriodResults(trades, initialBalance, today),
  };
}

export function calculatePeriodResults(
  trades: readonly Trade[],
  initialBalance: number,
  today: string,
): PeriodResults {
  return {
    daily: periodResult(trades, initialBalance, today, today),
    weekly: periodResult(trades, initialBalance, startOfWeek(today), today),
    monthly: periodResult(trades, initialBalance, `${today.slice(0, 7)}-01`, today),
  };
}

function periodResult(
  trades: readonly Trade[],
  initialBalance: number,
  start: string,
  end: string,
): PeriodResult {
  const inPeriod = trades.filter((trade) => trade.date >= start && trade.date <= end);
  const pnl = inPeriod.reduce((sum, trade) => sum + trade.pnl, 0);
  const previousPnl = trades
    .filter((trade) => trade.date < start)
    .reduce((sum, trade) => sum + trade.pnl, 0);
  const openingBalance = initialBalance + previousPnl;
  const pct = openingBalance > 0 ? (pnl / openingBalance) * 100 : 0;
  const lossPct =
    pnl < 0 && openingBalance > 0
      ? Math.min(100, (Math.abs(pnl) / openingBalance) * 100)
      : 0;

  return {
    pnl,
    openingBalance,
    pct,
    lossPct,
    trades: inPeriod.length,
    stops: inPeriod.filter((trade) => isStop(trade.pnl)).length,
  };
}

/** Segunda-feira da semana que contém a data informada (ISO YYYY-MM-DD). */
function startOfWeek(iso: string): string {
  const [year = 1970, month = 1, day = 1] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}
