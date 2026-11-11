import { grossLoss, isWeekend, type DailyPlan } from './dailyPlan';
import { consecutiveLossStopIndex, type Trade, type TradeSession } from './trade';

export type ViolationKind = 'TRADE_AFTER_LOSS_STOP' | 'MIXED_SESSIONS' | 'WEEKEND_TRADE' | 'LOSS_OVER_LIMIT' | 'BALANCE_DEPLETED';

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
  dailyPlans?: readonly DailyPlan[];
}

export interface DisciplineResult {
  streak: number;
  violations: Violation[];
}

export function evaluateDiscipline(input: DisciplineInput): DisciplineResult {
  const violations: Violation[] = [];
  const tradesByDate = new Map<string, Trade[]>();
  const plans = new Map(input.dailyPlans?.map(plan => [plan.date, plan]));
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
    const stopIndex = consecutiveLossStopIndex(trades);
    if (stopIndex >= 0 && stopIndex < trades.length - 1) {
      violations.push({ kind: 'TRADE_AFTER_LOSS_STOP', date, message: `Operação após o stop de duas perdas consecutivas em ${date}.` });
    }
    if (new Set(trades.map(trade => trade.session)).size > 1) {
      violations.push({ kind: 'MIXED_SESSIONS', date, message: `Operações em duas sessões no mesmo dia (${date}).` });
    }
    const limit = plans.get(date)?.lossLimit;
    if (limit != null && grossLoss(trades) > limit) {
      violations.push({ kind: 'LOSS_OVER_LIMIT', date, message: `Perda diária acima do limite configurado em ${date}.` });
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
