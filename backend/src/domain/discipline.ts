import { MAX_LOSS_RATIO, MAX_TRADES_PER_DAY, isBreakEven, type Trade } from './trade';

export type ViolationKind = 'TOO_MANY_TRADES' | 'LOSS_OVER_LIMIT' | 'BALANCE_DEPLETED';

export interface Violation {
  kind: ViolationKind;
  date?: string;
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
  const byDate = new Map<string, Trade[]>();

  for (const trade of input.trades) {
    const day = byDate.get(trade.date) ?? [];
    day.push(trade);
    byDate.set(trade.date, day);
  }

  for (const [date, trades] of byDate) {
    if (trades.length > MAX_TRADES_PER_DAY) {
      violations.push({
        kind: 'TOO_MANY_TRADES',
        date,
        message: `${trades.length} operações em ${date}; o limite é ${MAX_TRADES_PER_DAY} por dia.`,
      });
    }

    const openingBalance = openingBalanceBefore(date, input.trades, input.initialBalance);
    const maxLoss = openingBalance * MAX_LOSS_RATIO;
    for (const trade of trades) {
      if (trade.pnl < 0 && !isBreakEven(trade.pnl) && Math.abs(trade.pnl) > maxLoss) {
        violations.push({
          kind: 'LOSS_OVER_LIMIT',
          date,
          message: `Perda de ${formatMoney(trade.pnl)} em ${date} passou de ${formatMoney(maxLoss)} (${MAX_LOSS_RATIO * 100}% do saldo inicial do dia).`,
        });
      }
    }
  }

  const totalPnl = input.trades.reduce((sum, trade) => sum + trade.pnl, 0);
  const balance = input.initialBalance + totalPnl;

  if (input.trades.length > 0 && balance <= 0) {
    violations.push({
      kind: 'BALANCE_DEPLETED',
      date: latestDate(byDate),
      message: `Patrimônio zerado: saldo de ${formatMoney(balance)}.`,
    });
  }

  violations.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));

  if (violations.length > 0) {
    return { streak: 0, violations };
  }

  return { streak: countActiveDays(input.trades, input.noTradeDays), violations };
}

export function calculateStreak(input: DisciplineInput): number {
  return evaluateDiscipline(input).streak;
}

function countActiveDays(trades: readonly Trade[], noTradeDays: readonly string[]): number {
  const days = new Set<string>();
  for (const trade of trades) days.add(trade.date);
  for (const day of noTradeDays) days.add(day);
  return days.size;
}

function latestDate(byDate: Map<string, Trade[]>): string | undefined {
  let latest: string | undefined;
  for (const date of byDate.keys()) {
    if (!latest || date > latest) latest = date;
  }
  return latest;
}

// Saldo de abertura do dia: capital inicial + resultado acumulado dos dias anteriores.
// O dia da operação não entra na base (o limite é definido antes de operar).
function openingBalanceBefore(
  date: string,
  trades: readonly Trade[],
  initialBalance: number,
): number {
  const previousPnl = trades
    .filter((trade) => trade.date < date)
    .reduce((sum, trade) => sum + trade.pnl, 0);

  return initialBalance + previousPnl;
}

function formatMoney(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'USD' });
}
