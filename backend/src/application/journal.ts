import { DomainError } from '../domain/errors';
import {
  MAX_LOSS_RATIO,
  MAX_TRADES_PER_DAY,
  createTrade,
  isBreakEven,
  isIsoDate,
  type Trade,
  type TradeInput,
} from '../domain/trade';
import { evaluateDiscipline, type DisciplineResult } from '../domain/discipline';
import { calculateStats, type Stats } from '../domain/stats';
import type {
  Clock,
  NoTradeDayRepository,
  PendingJob,
  PendingJobStorage,
  SettingsRepository,
  TradeRepository,
} from './ports';

export interface JournalSnapshot {
  trades: Trade[];
  noTradeDays: string[];
  initialBalance: number;
  stats: Stats;
  discipline: DisciplineResult;
}

export interface SaveTradeResult {
  trade: Trade;
  synced: boolean;
  warnings: string[];
}

export interface SyncResult {
  pending: number;
  flushed: number;
}

export interface JournalService {
  list(): Promise<JournalSnapshot>;
  saveTrade(input: TradeInput): Promise<SaveTradeResult>;
  deleteTrade(id: string): Promise<{ synced: boolean }>;
  registerNoTradeDay(day: string): Promise<{ synced: boolean }>;
  removeNoTradeDay(day: string): Promise<{ synced: boolean }>;
  saveInitialBalance(value: number): Promise<{ synced: boolean }>;
  pendingCount(): Promise<number>;
  flush(): Promise<SyncResult>;
}

export interface JournalDeps {
  trades: TradeRepository;
  noTradeDays: NoTradeDayRepository;
  settings: SettingsRepository;
  pending: PendingJobStorage;
  clock: Clock;
}

export function createJournalService(deps: JournalDeps): JournalService {
  const { trades, noTradeDays, settings, pending, clock } = deps;

  async function enqueue(job: PendingJob): Promise<void> {
    const jobs = await pending.read();
    jobs.push(job);
    await pending.write(jobs);
  }

  async function execute(job: PendingJob): Promise<void> {
    switch (job.op) {
      case 'upsertTrade':
        await trades.upsert(job.trade);
        break;
      case 'deleteTrade':
        await trades.remove(job.id);
        break;
      case 'addNoTradeDay':
        await noTradeDays.add(job.day);
        break;
      case 'removeNoTradeDay':
        await noTradeDays.remove(job.day);
        break;
      case 'setInitialBalance':
        await settings.setInitialBalance(job.value);
        break;
    }
  }

  return {
    async list() {
      const [tradeList, noTradeDayList, initialBalance] = await Promise.all([
        trades.list(),
        noTradeDays.list(),
        settings.getInitialBalance(),
      ]);

      const sortedTrades = [...tradeList].sort((a, b) => a.date.localeCompare(b.date));

      return {
        trades: sortedTrades,
        noTradeDays: [...noTradeDayList].sort(),
        initialBalance,
        stats: calculateStats({
          trades: sortedTrades,
          initialBalance,
          today: clock.today(),
        }),
        discipline: evaluateDiscipline({
          trades: sortedTrades,
          noTradeDays: noTradeDayList,
          initialBalance,
        }),
      };
    },

    async saveTrade(input) {
      const trade = createTrade(input);

      const [existingTrades, knownBalance] = await Promise.all([
        trades.list().catch(() => [] as Trade[]),
        settings.getInitialBalance().catch(() => null),
      ]);

      const warnings = buildWarnings(trade, existingTrades, knownBalance);

      try {
        await trades.upsert(trade);
        return { trade, synced: true, warnings };
      } catch {
        await enqueue({ op: 'upsertTrade', trade });
        return { trade, synced: false, warnings };
      }
    },

    async deleteTrade(id) {
      try {
        await trades.remove(id);
        return { synced: true };
      } catch {
        await enqueue({ op: 'deleteTrade', id });
        return { synced: false };
      }
    },

    async registerNoTradeDay(day) {
      if (!isIsoDate(day)) {
        throw new DomainError('INVALID_DATE', 'Data inválida.');
      }

      const existingTrades = await trades.list().catch(() => [] as Trade[]);
      if (existingTrades.some((trade) => trade.date === day)) {
        throw new DomainError(
          'NO_TRADE_WITH_TRADES',
          'Não é possível marcar um dia sem operação quando já existe operação nessa data.',
        );
      }

      try {
        await noTradeDays.add(day);
        return { synced: true };
      } catch {
        await enqueue({ op: 'addNoTradeDay', day });
        return { synced: false };
      }
    },

    async removeNoTradeDay(day) {
      try {
        await noTradeDays.remove(day);
        return { synced: true };
      } catch {
        await enqueue({ op: 'removeNoTradeDay', day });
        return { synced: false };
      }
    },

    async saveInitialBalance(value) {
      if (!Number.isFinite(value) || value < 0) {
        throw new DomainError('INVALID_BALANCE', 'O capital inicial deve ser maior ou igual a zero.');
      }

      try {
        await settings.setInitialBalance(value);
        return { synced: true };
      } catch {
        await enqueue({ op: 'setInitialBalance', value });
        return { synced: false };
      }
    },

    async pendingCount() {
      const jobs = await pending.read();
      return jobs.length;
    },

    async flush() {
      const jobs = await pending.read();
      let flushed = 0;

      while (jobs.length > 0) {
        const job = jobs[0];
        if (!job) break;

        try {
          await execute(job);
        } catch {
          await pending.write(jobs);
          return { pending: jobs.length, flushed };
        }

        jobs.shift();
        flushed += 1;
        await pending.write(jobs);
      }

      return { pending: 0, flushed };
    },
  };
}

function buildWarnings(
  trade: Trade,
  existingTrades: readonly Trade[],
  initialBalance: number | null,
): string[] {
  const warnings: string[] = [];

  const sameDay = existingTrades.filter((item) => item.date === trade.date);
  if (sameDay.length >= MAX_TRADES_PER_DAY) {
    warnings.push(`Limite de ${MAX_TRADES_PER_DAY} operações por dia atingido.`);
  }

  if (initialBalance === null) return warnings;

  if (
    trade.pnl < 0 &&
    !isBreakEven(trade.pnl) &&
    Math.abs(trade.pnl) > initialBalance * MAX_LOSS_RATIO
  ) {
    warnings.push(`Perda acima de ${MAX_LOSS_RATIO * 100}% do capital inicial.`);
  }

  const balance =
    initialBalance + existingTrades.reduce((sum, item) => sum + item.pnl, 0) + trade.pnl;
  if (balance <= 0) {
    warnings.push('Atenção: o patrimônio ficou zerado ou negativo.');
  }

  return warnings;
}
