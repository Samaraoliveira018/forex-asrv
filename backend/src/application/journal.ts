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
  ScreenshotStorage,
  SettingsRepository,
  TradeRepository,
} from './ports';

export interface JournalSnapshot {
  trades: Trade[];
  noTradeDays: string[];
  initialBalance: number;
  stats: Stats;
  discipline: DisciplineResult;
  /** URLs assinadas (temporárias) dos prints, indexadas pelo id da operação. */
  screenshotUrls: Record<string, string>;
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
  /**
   * Salva a operação. O segundo argumento controla o print:
   * - `undefined`: mantém o print atual;
   * - string (data URL): anexa/substitui o print;
   * - `null`: remove o print.
   */
  saveTrade(input: TradeInput, screenshotDataUrl?: string | null): Promise<SaveTradeResult>;
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
  screenshots: ScreenshotStorage;
  pending: PendingJobStorage;
  clock: Clock;
}

export function createJournalService(deps: JournalDeps): JournalService {
  const { trades, noTradeDays, settings, screenshots, pending, clock } = deps;

  async function enqueue(job: PendingJob): Promise<void> {
    const jobs = await pending.read();
    jobs.push(job);
    await pending.write(jobs);
  }

  async function execute(job: PendingJob): Promise<void> {
    switch (job.op) {
      case 'upsertTrade': {
        let target = job.trade;
        if (job.screenshotDataUrl) {
          const path = await screenshots.upload(target.id, job.screenshotDataUrl);
          target = { ...target, screenshotPath: path };
        }
        await trades.upsert(target);
        break;
      }
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

  async function saveWithPendingScreenshot(
    trade: Trade,
    screenshotDataUrl: string,
  ): Promise<SaveTradeResult> {
    const [existingTrades, knownBalance] = await Promise.all([
      trades.list().catch(() => [] as Trade[]),
      settings.getInitialBalance().catch(() => null),
    ]);

    await enqueue({ op: 'upsertTrade', trade, screenshotDataUrl });
    return { trade, synced: false, warnings: buildWarnings(trade, existingTrades, knownBalance) };
  }

  async function signScreenshots(list: readonly Trade[]): Promise<Record<string, string>> {
    const paths = list
      .map((trade) => trade.screenshotPath)
      .filter((path) => path.length > 0);
    if (paths.length === 0) return {};

    let byPath: Record<string, string>;
    try {
      byPath = await screenshots.signedUrls(paths);
    } catch {
      return {};
    }

    const urls: Record<string, string> = {};
    for (const trade of list) {
      const url = trade.screenshotPath ? byPath[trade.screenshotPath] : undefined;
      if (url) urls[trade.id] = url;
    }
    return urls;
  }

  return {
    async list() {
      const [tradeList, noTradeDayList, initialBalance] = await Promise.all([
        trades.list(),
        noTradeDays.list(),
        settings.getInitialBalance(),
      ]);

      const sortedTrades = [...tradeList].sort((a, b) => a.date.localeCompare(b.date));

      const screenshotUrls = await signScreenshots(sortedTrades);

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
        screenshotUrls,
      };
    },

    async saveTrade(input, screenshotDataUrl) {
      const trade = createTrade(input);

      if (typeof screenshotDataUrl === 'string') {
        try {
          trade.screenshotPath = await screenshots.upload(trade.id, screenshotDataUrl);
        } catch {
          // Sem conexão: guarda a imagem na fila para subir junto com a operação.
          return saveWithPendingScreenshot(trade, screenshotDataUrl);
        }
      } else if (screenshotDataUrl === null) {
        trade.screenshotPath = '';
        try {
          await screenshots.remove(trade.id);
        } catch {
          // A remoção do print é best-effort; a operação continua válida sem ele.
        }
      }

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
        try {
          await screenshots.remove(id);
        } catch {
          // Sem print ou sem rede: ignora, o registro já foi removido.
        }
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

  // Break even não conta para o limite diário; a própria operação (edição) fica de fora.
  const sameDay = existingTrades.filter(
    (item) => item.date === trade.date && item.id !== trade.id && !isBreakEven(item.pnl),
  );
  if (!isBreakEven(trade.pnl) && sameDay.length >= MAX_TRADES_PER_DAY) {
    warnings.push(
      `Limite de ${MAX_TRADES_PER_DAY} operações por dia atingido (break even não conta).`,
    );
  }

  if (initialBalance === null) return warnings;

  const openingBalance =
    initialBalance +
    existingTrades
      .filter((item) => item.date < trade.date)
      .reduce((sum, item) => sum + item.pnl, 0);

  if (
    trade.pnl < 0 &&
    !isBreakEven(trade.pnl) &&
    Math.abs(trade.pnl) > openingBalance * MAX_LOSS_RATIO
  ) {
    warnings.push(`Perda acima de ${MAX_LOSS_RATIO * 100}% do saldo inicial do dia.`);
  }

  const balance =
    initialBalance + existingTrades.reduce((sum, item) => sum + item.pnl, 0) + trade.pnl;
  if (balance <= 0) {
    warnings.push('Atenção: o patrimônio ficou zerado ou negativo.');
  }

  return warnings;
}
