import {
  MAX_LOSS_RATIO,
  MAX_STOPS_PER_SESSION,
  MAX_TRADES_PER_SESSION,
  isBreakEven,
  isStop,
  sessionLabel,
  type Trade,
  type TradeSession,
} from './trade';

export type ViolationKind =
  | 'TOO_MANY_TRADES'
  | 'TOO_MANY_STOPS'
  | 'LOSS_OVER_LIMIT'
  | 'BALANCE_DEPLETED';

export interface Violation {
  kind: ViolationKind;
  date?: string;
  /** Sessão relacionada à violação (limites de trades/stops). */
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
  const byDate = new Map<string, Trade[]>();

  for (const trade of input.trades) {
    const day = byDate.get(trade.date) ?? [];
    day.push(trade);
    byDate.set(trade.date, day);
  }

  for (const [date, trades] of byDate) {
    // Os limites são independentes por sessão: 4 trades e 2 stops de dia + 4 trades e 2 stops de noite.
    for (const session of ['day', 'night'] as const) {
      const sessionTrades = trades.filter((trade) => trade.session === session);

      // Break even não conta para o limite da sessão: só operações com resultado relevante.
      const countedTrades = sessionTrades.filter((trade) => !isBreakEven(trade.pnl));
      if (countedTrades.length > MAX_TRADES_PER_SESSION) {
        violations.push({
          kind: 'TOO_MANY_TRADES',
          date,
          session,
          message: `${countedTrades.length} operações em ${date} (sessão ${sessionLabel(session)}); o limite é ${MAX_TRADES_PER_SESSION} por sessão (break even não conta).`,
        });
      }

      // Stop = perda real. Ao passar de 2 stops na sessão, a disciplina foi quebrada.
      const stops = sessionTrades.filter((trade) => isStop(trade.pnl));
      if (stops.length > MAX_STOPS_PER_SESSION) {
        violations.push({
          kind: 'TOO_MANY_STOPS',
          date,
          session,
          message: `${stops.length} stops em ${date} (sessão ${sessionLabel(session)}); o limite é ${MAX_STOPS_PER_SESSION} por sessão. Após 2 stops, pare de operar nessa sessão.`,
        });
      }
    }

    const openingBalance = openingBalanceBefore(date, input.trades, input.initialBalance);
    const maxLoss = openingBalance * MAX_LOSS_RATIO;
    for (const trade of trades) {
      if (trade.pnl < 0 && !isBreakEven(trade.pnl) && Math.abs(trade.pnl) > maxLoss) {
        violations.push({
          kind: 'LOSS_OVER_LIMIT',
          date,
          session: trade.session,
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
