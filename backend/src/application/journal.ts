import { DomainError } from '../domain/errors';
import {
  createTrade,
  isIsoDate,
  type Trade,
  type TradeInput,
} from '../domain/trade';
import { CHECKLIST_SECTIONS, grossLoss, isWeekend, MAX_TRADES_PER_DAY, type DailyPlan } from '../domain/dailyPlan';
import { evaluateDiscipline, type DisciplineResult } from '../domain/discipline';
import { calculateStats, type Stats } from '../domain/stats';
import type {
  Clock,
  DailyPlanRepository,
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
  dailyPlans: DailyPlan[];
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
  saveDailyPlan(plan: DailyPlan): Promise<void>;
  resetJournal(): Promise<{ failedScreenshots: number }>;
  pendingCount(): Promise<number>;
  flush(): Promise<SyncResult>;
}

export interface JournalDeps {
  trades: TradeRepository;
  noTradeDays: NoTradeDayRepository;
  dailyPlans: DailyPlanRepository;
  settings: SettingsRepository;
  screenshots: ScreenshotStorage;
  pending: PendingJobStorage;
  clock: Clock;
}

export function createJournalService(deps: JournalDeps): JournalService {
  const { trades, noTradeDays, dailyPlans, settings, screenshots, pending, clock } = deps;

  async function enqueue(job: PendingJob): Promise<void> {
    const jobs = await pending.read();
    jobs.push({ ...job, queuedAt: Date.now() });
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
      const [tradeList, noTradeDayList, initialBalance, planList] = await Promise.all([
        trades.list(),
        noTradeDays.list(),
        settings.getInitialBalance(),
        dailyPlans.list(),
      ]);

      const sortedTrades = [...tradeList].sort((a, b) => a.date.localeCompare(b.date));

      const screenshotUrls = await signScreenshots(sortedTrades);

      return {
        trades: sortedTrades,
        noTradeDays: [...noTradeDayList].sort(),
        dailyPlans: planList,
        initialBalance,
        stats: calculateStats({
          trades: sortedTrades,
          initialBalance,
          today: clock.today(),
        }),
        discipline: evaluateDiscipline({
          trades: sortedTrades,
          noTradeDays: noTradeDayList,
          dailyPlans: planList,
          initialBalance,
        }),
        screenshotUrls,
      };
    },

    async saveTrade(input, screenshotDataUrl) {
      const trade = createTrade(input);

      const [storedTrades, plans, jobs] = await Promise.all([
        trades.list().catch(() => [] as Trade[]),
        dailyPlans.list().catch(() => [] as DailyPlan[]),
        pending.read(),
      ]);
      const existingTrades = new Map(storedTrades.map(item => [item.id, item]));
      for (const job of jobs) {
        if (job.op === 'upsertTrade') existingTrades.set(job.trade.id, job.trade);
        if (job.op === 'deleteTrade') existingTrades.delete(job.id);
      }
      const previous = existingTrades.get(trade.id);
      const sameDay = [...existingTrades.values()].filter(item => item.date === trade.date && item.id !== trade.id);
      const addsToDay = previous?.date !== trade.date;
      const limit = plans.find(plan => plan.date === trade.date)?.lossLimit;
      if (isWeekend(trade.date) && addsToDay && !input.weekendBreach) {
        throw new DomainError('TRADE_RULE', 'Sábado e domingo são dias sem operar. Para registrar uma operação já feita, confirme a quebra de regra.');
      }
      if (addsToDay && sameDay.length >= MAX_TRADES_PER_DAY) {
        throw new DomainError('TRADE_RULE', 'Você já registrou duas operações nessa data, incluindo break even.');
      }
      if ((addsToDay || previous?.session !== trade.session) && sameDay.some(item => item.session !== trade.session)) {
        throw new DomainError('TRADE_RULE', 'As duas operações devem ser da mesma sessão.');
      }
      if (addsToDay && limit != null && grossLoss(sameDay) >= limit) {
        throw new DomainError('TRADE_RULE', 'O limite de perda diária já foi atingido.');
      }

      const warnings: string[] = [];
      if (isWeekend(trade.date)) warnings.push('Operação de fim de semana registrada. A ofensiva reinicia após esta data.');
      if (limit != null && grossLoss([...sameDay, trade]) >= limit) {
        warnings.push('Limite de perda diária atingido. Encerre as operações do dia.');
      }
      if (sameDay.length + 1 === MAX_TRADES_PER_DAY) warnings.push('Duas operações registradas. Encerre as operações do dia.');

      if (typeof screenshotDataUrl === 'string') {
        try {
          trade.screenshotPath = await screenshots.upload(trade.id, screenshotDataUrl);
        } catch {
          await enqueue({ op: 'upsertTrade', trade, screenshotDataUrl });
          return { trade, synced: false, warnings };
        }
      } else if (screenshotDataUrl === null) {
        trade.screenshotPath = '';
      }

      try {
        await trades.upsert(trade);
        if (screenshotDataUrl === null) await screenshots.remove(trade.id).catch(() => undefined);
        return { trade, synced: true, warnings };
      } catch (error) {
        if (error instanceof DomainError) throw error;
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

    async saveDailyPlan(plan) {
      const limit = plan.lossLimit === null ? null : Number(plan.lossLimit.toFixed(2));
      if (!isIsoDate(plan.date) || (limit !== null && (!Number.isFinite(limit) || limit <= 0 || limit >= 1e12))) {
        throw new DomainError('INVALID_DAILY_PLAN', 'Informe uma data válida e um limite maior que zero.');
      }
      const answers: DailyPlan['answers'] = {};
      for (const section of CHECKLIST_SECTIONS) {
        for (const field of section.fields) {
          const value = plan.answers[field.id];
          if (typeof value === 'boolean') answers[field.id] = value;
          else if (typeof value === 'string') answers[field.id] = value.trim().slice(0, 2000);
        }
      }
      await dailyPlans.save({ date: plan.date, lossLimit: limit, answers });
    },

    async resetJournal() {
      const ids = await dailyPlans.resetJournal();
      await pending.write([]);
      const deleted = await Promise.allSettled(ids.map(id => screenshots.remove(id)));
      return { failedScreenshots: deleted.filter(result => result.status === 'rejected').length };
    },

    async pendingCount() {
      const jobs = await pending.read();
      return jobs.length;
    },

    async flush() {
      let jobs = await pending.read();
      if (jobs.length === 0) return { pending: 0, flushed: 0 };
      let resetAt: number | null;
      try {
        resetAt = await dailyPlans.resetAt();
      } catch {
        return { pending: jobs.length, flushed: 0 };
      }
      if (resetAt !== null) {
        jobs = jobs.filter(job => (job.queuedAt ?? 0) > resetAt);
        await pending.write(jobs);
      }
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
