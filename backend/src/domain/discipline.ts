import { MAX_DAILY_TRADES, dailyLossLimit, grossLoss, isWeekend } from './dailyPlan';
import { type Trade, type TradeSession } from './trade';

export type ViolationKind = 'DAILY_TRADE_LIMIT' | 'MIXED_SESSIONS' | 'WEEKEND_TRADE' | 'LOSS_OVER_LIMIT' | 'BALANCE_DEPLETED';

export interface Violation {
  kind: ViolationKind;
  date?: string;
  session?: TradeSession;
  message: string;
}

export interface DisciplineInput {
  trades: readonly Trade[];
  noTradeDays: readonly string[];
  initialBalance: number;
}

export interface DisciplineResult {
  streak: number;
  violations: Violation[];
}

export function evaluateDiscipline(input: DisciplineInput): DisciplineResult {
  const violations: Violation[] = [];
  const tradesByDate = new Map<string, Trade[]>();
  for (const trade of input.trades) {
    const day = tradesByDate.get(trade.date) ?? [];
    day.push(trade);
    tradesByDate.set(trade.date, day);
  }

  let balance = input.initialBalance;
  for (const [date, trades] of [...tradesByDate].sort(([a], [b]) => a.localeCompare(b))) {
    if (isWeekend(date)) {
      violations.push({ kind: 'WEEKEND_TRADE', date, message: `Operação de fim de semana registrada em ${date}.` });
    }
    if (trades.length > MAX_DAILY_TRADES) {
      violations.push({ kind: 'DAILY_TRADE_LIMIT', date, message: `Mais de duas operações registradas em ${date}.` });
    }
    if (new Set(trades.map(trade => trade.session)).size > 1) {
      violations.push({ kind: 'MIXED_SESSIONS', date, message: `Operações em duas sessões no mesmo dia (${date}).` });
    }
    const limit = dailyLossLimit(balance);
    if (grossLoss(trades) > limit || (trades.length > 1 && grossLoss(trades.slice(0, -1)) >= limit)) {
      violations.push({ kind: 'LOSS_OVER_LIMIT', date, message: `Limite de perda diária descumprido em ${date}.` });
    }
    const before = balance;
    balance += trades.reduce((sum, trade) => sum + trade.pnl, 0);
    if (balance <= 0 && (before > 0 || trades.some(trade => trade.pnl < 0))) {
      violations.push({ kind: 'BALANCE_DEPLETED', date, message: `Patrimônio zerado ou negativo em ${date}.` });
    }
  }

  const lastViolation = violations.at(-1)?.date ?? '';
  const days = new Set([...tradesByDate.keys(), ...input.noTradeDays]);
  const streak = [...days].filter(date => date > lastViolation && !isWeekend(date)).length;
  return { streak, violations };
}

export function calculateStreak(input: DisciplineInput): number {
  return evaluateDiscipline(input).streak;
}
