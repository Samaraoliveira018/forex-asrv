import { describe, expect, it } from 'vitest';
import { DomainError } from '../domain/errors';
import { createTrade, type Trade } from '../domain/trade';
import { createJournalService } from './journal';
import type {
  AuthGateway,
  AuthSession,
  NoTradeDayRepository,
  PendingJob,
  PendingJobStorage,
  ScreenshotStorage,
  SettingsRepository,
  TradeRepository,
} from './ports';
import { createAuthService } from './auth';

class FakeTradeRepository implements TradeRepository {
  items: Trade[] = [];
  fail = false;

  async list(): Promise<Trade[]> {
    if (this.fail) throw new Error('offline');
    return [...this.items];
  }

  async upsert(trade: Trade): Promise<void> {
    if (this.fail) throw new Error('offline');
    this.items = [...this.items.filter((item) => item.id !== trade.id), trade];
  }

  async remove(id: string): Promise<void> {
    if (this.fail) throw new Error('offline');
    this.items = this.items.filter((item) => item.id !== id);
  }
}

class FakeNoTradeDayRepository implements NoTradeDayRepository {
  items: string[] = [];
  fail = false;

  async list(): Promise<string[]> {
    if (this.fail) throw new Error('offline');
    return [...this.items];
  }

  async add(day: string): Promise<void> {
    if (this.fail) throw new Error('offline');
    if (!this.items.includes(day)) this.items.push(day);
  }

  async remove(day: string): Promise<void> {
    if (this.fail) throw new Error('offline');
    this.items = this.items.filter((item) => item !== day);
  }
}

class FakeSettingsRepository implements SettingsRepository {
  value = 1000;
  fail = false;

  async getInitialBalance(): Promise<number> {
    if (this.fail) throw new Error('offline');
    return this.value;
  }

  async setInitialBalance(value: number): Promise<void> {
    if (this.fail) throw new Error('offline');
    this.value = value;
  }
}

class FakeQueue implements PendingJobStorage {
  jobs: PendingJob[] = [];

  async read(): Promise<PendingJob[]> {
    return [...this.jobs];
  }

  async write(jobs: PendingJob[]): Promise<void> {
    this.jobs = [...jobs];
  }
}

class FakeScreenshotStorage implements ScreenshotStorage {
  uploads: Array<{ tradeId: string; dataUrl: string }> = [];
  removed: string[] = [];
  fail = false;

  async upload(tradeId: string, dataUrl: string): Promise<string> {
    if (this.fail) throw new Error('offline');
    this.uploads.push({ tradeId, dataUrl });
    return `${tradeId}.jpg`;
  }

  async signedUrls(paths: readonly string[]): Promise<Record<string, string>> {
    if (this.fail) throw new Error('offline');
    const map: Record<string, string> = {};
    for (const path of paths) map[path] = `https://signed/${path}`;
    return map;
  }

  async remove(tradeId: string): Promise<void> {
    if (this.fail) throw new Error('offline');
    this.removed.push(tradeId);
  }
}

class FakeAuth implements AuthGateway {
  session: AuthSession | null = null;
  signedInWith: { email: string; password: string } | null = null;

  async getSession(): Promise<AuthSession | null> {
    return this.session;
  }

  async signIn(email: string, password: string): Promise<AuthSession> {
    this.signedInWith = { email, password };
    this.session = { userId: 'user-1', email };
    return this.session;
  }

  async signOut(): Promise<void> {
    this.session = null;
  }

  onChange(): () => void {
    return () => undefined;
  }
}

function setup() {
  const trades = new FakeTradeRepository();
  const noTradeDays = new FakeNoTradeDayRepository();
  const settings = new FakeSettingsRepository();
  const screenshots = new FakeScreenshotStorage();
  const pending = new FakeQueue();

  const service = createJournalService({
    trades,
    noTradeDays,
    settings,
    screenshots,
    pending,
    clock: { today: () => '2026-10-22' },
  });

  return { trades, noTradeDays, settings, screenshots, pending, service };
}

function seedTrade(trades: FakeTradeRepository, overrides: Partial<Trade> = {}): Trade {
  const trade = createTrade({
    id: `seed-${trades.items.length + 1}`,
    date: '2026-10-21',
    asset: 'EURUSD',
    type: 'Compra',
    lots: 1,
    pnl: 10,
    ...overrides,
  });
  trades.items.push(trade);
  return trade;
}

describe('createJournalService', () => {
  it('monta o retrato do diário com estatísticas e disciplina', async () => {
    const { trades, noTradeDays, service } = setup();
    seedTrade(trades, { date: '2026-10-20', pnl: 100 });
    seedTrade(trades, { date: '2026-10-21', pnl: -50 });
    noTradeDays.items.push('2026-10-19');

    const snapshot = await service.list();

    expect(snapshot.trades).toHaveLength(2);
    expect(snapshot.noTradeDays).toEqual(['2026-10-19']);
    expect(snapshot.initialBalance).toBe(1000);
    expect(snapshot.stats.totalTrades).toBe(2);
    expect(snapshot.stats.totalPnl).toBe(50);
    expect(snapshot.discipline.streak).toBe(3);
  });

  it('salva uma operação online e devolve sincronizado', async () => {
    const { trades, service } = setup();

    const result = await service.saveTrade({
      id: 'nova',
      date: '2026-10-21',
      asset: 'gbpusd',
      type: 'Venda',
      lots: 0.5,
      pnl: 25,
    });

    expect(result.synced).toBe(true);
    expect(result.warnings).toEqual([]);
    expect(trades.items).toContainEqual(
      expect.objectContaining({ id: 'nova', asset: 'GBPUSD', pnl: 25 }),
    );
  });

  it('avisa ao passar do limite diário, mas salva mesmo assim', async () => {
    const { trades, service } = setup();
    seedTrade(trades, { date: '2026-10-21' });
    seedTrade(trades, { date: '2026-10-21' });

    const result = await service.saveTrade({
      date: '2026-10-21',
      asset: 'EURUSD',
      type: 'Compra',
      lots: 1,
      pnl: 5,
    });

    expect(result.synced).toBe(true);
    expect(result.warnings.join(' ').toLowerCase()).toContain('limite');
    expect(trades.items).toHaveLength(3);
  });

  it('avisa quando a perda individual passa de 25% do saldo inicial do dia', async () => {
    const { service } = setup();

    const result = await service.saveTrade({
      date: '2026-10-21',
      asset: 'EURUSD',
      type: 'Compra',
      lots: 1,
      pnl: -250.01,
    });

    expect(result.warnings.join(' ')).toContain('25%');
  });

  it('usa o saldo de abertura do dia no aviso de perda', async () => {
    const { service, trades } = setup();
    trades.items = [
      createTrade({
        id: 'gain',
        date: '2026-10-20',
        asset: 'EURUSD',
        type: 'Compra',
        lots: 1,
        pnl: 1000,
      }),
    ];

    const result = await service.saveTrade({
      date: '2026-10-21',
      asset: 'EURUSD',
      type: 'Compra',
      lots: 1,
      pnl: -300,
    });

    // O dia 21 abre com 2000, então o limite é 500. A perda de 300 não gera aviso.
    expect(result.warnings.join(' ')).not.toContain('saldo inicial do dia');
  });

  it('enfileira a operação quando o repositório está offline', async () => {
    const { trades, pending, service } = setup();
    trades.fail = true;

    const result = await service.saveTrade({
      id: 'offline',
      date: '2026-10-21',
      asset: 'EURUSD',
      type: 'Compra',
      lots: 1,
      pnl: 10,
    });

    expect(result.synced).toBe(false);
    expect(result.trade.id).toBe('offline');
    expect(await service.pendingCount()).toBe(1);
    expect(pending.jobs[0]).toEqual({ op: 'upsertTrade', trade: result.trade });
  });

  it('anexa o print ao salvar a operação', async () => {
    const { trades, screenshots, service } = setup();
    const dataUrl = 'data:image/jpeg;base64,AAECAwQ=';

    const result = await service.saveTrade(
      { id: 't1', date: '2026-10-21', asset: 'EURUSD', type: 'Compra', lots: 1, pnl: 10 },
      dataUrl,
    );

    expect(result.synced).toBe(true);
    expect(result.trade.screenshotPath).toBe('t1.jpg');
    expect(trades.items[0]?.screenshotPath).toBe('t1.jpg');
    expect(screenshots.uploads).toEqual([{ tradeId: 't1', dataUrl }]);
  });

  it('remove o print quando recebe null', async () => {
    const { trades, screenshots, service } = setup();
    seedTrade(trades, { id: 't1', screenshotPath: 't1.jpg' });

    const result = await service.saveTrade(
      {
        id: 't1',
        date: '2026-10-21',
        asset: 'EURUSD',
        type: 'Compra',
        lots: 1,
        pnl: 10,
        screenshotPath: 't1.jpg',
      },
      null,
    );

    expect(result.trade.screenshotPath).toBe('');
    expect(screenshots.removed).toContain('t1');
  });

  it('enfileira o print junto com a operação quando está offline', async () => {
    const { trades, screenshots, pending, service } = setup();
    trades.fail = true;
    screenshots.fail = true;
    const dataUrl = 'data:image/jpeg;base64,AAECAwQ=';

    const result = await service.saveTrade(
      { id: 'offline-print', date: '2026-10-21', asset: 'EURUSD', type: 'Compra', lots: 1, pnl: 10 },
      dataUrl,
    );

    expect(result.synced).toBe(false);
    expect(result.trade.screenshotPath).toBe('');
    expect(pending.jobs[0]).toEqual({
      op: 'upsertTrade',
      trade: result.trade,
      screenshotDataUrl: dataUrl,
    });
  });

  it('sobe o print pendente ao sincronizar', async () => {
    const { trades, screenshots, service } = setup();
    const dataUrl = 'data:image/jpeg;base64,AAECAwQ=';
    trades.fail = true;
    screenshots.fail = true;

    await service.saveTrade(
      { id: 'pendente', date: '2026-10-21', asset: 'EURUSD', type: 'Compra', lots: 1, pnl: 10 },
      dataUrl,
    );

    trades.fail = false;
    screenshots.fail = false;

    expect(await service.flush()).toEqual({ pending: 0, flushed: 1 });
    expect(trades.items[0]?.screenshotPath).toBe('pendente.jpg');
    expect(screenshots.uploads).toEqual([{ tradeId: 'pendente', dataUrl }]);
  });

  it('lista as URLs assinadas dos prints', async () => {
    const { trades, service } = setup();
    seedTrade(trades, { id: 'com-print', screenshotPath: 'com-print.jpg' });
    seedTrade(trades, { id: 'sem-print', date: '2026-10-20' });

    const snapshot = await service.list();

    expect(snapshot.screenshotUrls).toEqual({ 'com-print': 'https://signed/com-print.jpg' });
  });

  it('exclui o print junto com a operação', async () => {
    const { trades, screenshots, service } = setup();
    const trade = seedTrade(trades, { id: 't1', screenshotPath: 't1.jpg' });

    await service.deleteTrade(trade.id);

    expect(screenshots.removed).toContain('t1');
  });

  it('enfileira a exclusão quando o repositório está offline', async () => {
    const { trades, pending, service } = setup();
    trades.fail = true;

    const result = await service.deleteTrade('trade-1');

    expect(result.synced).toBe(false);
    expect(pending.jobs[0]).toEqual({ op: 'deleteTrade', id: 'trade-1' });
  });

  it('exclui uma operação online', async () => {
    const { trades, service } = setup();
    const trade = seedTrade(trades);

    await service.deleteTrade(trade.id);

    expect(trades.items).toEqual([]);
  });

  it('não aceita dia sem operação quando já existe operação na data', async () => {
    const { trades, noTradeDays, service } = setup();
    seedTrade(trades, { date: '2026-10-21' });

    await expect(service.registerNoTradeDay('2026-10-21')).rejects.toMatchObject({
      code: 'NO_TRADE_WITH_TRADES',
    });
    expect(noTradeDays.items).toEqual([]);
  });

  it('registra e remove dia sem operação', async () => {
    const { noTradeDays, service } = setup();

    await service.registerNoTradeDay('2026-10-22');
    expect(noTradeDays.items).toEqual(['2026-10-22']);

    await service.removeNoTradeDay('2026-10-22');
    expect(noTradeDays.items).toEqual([]);
  });

  it('rejeita data inválida no dia sem operação', async () => {
    const { service } = setup();

    await expect(service.registerNoTradeDay('22/10/2026')).rejects.toBeInstanceOf(DomainError);
  });

  it('valida e salva o capital inicial', async () => {
    const { settings, service } = setup();

    await service.saveInitialBalance(2500);
    expect(settings.value).toBe(2500);

    await expect(service.saveInitialBalance(-1)).rejects.toMatchObject({
      code: 'INVALID_BALANCE',
    });
    await expect(service.saveInitialBalance(Number.NaN)).rejects.toMatchObject({
      code: 'INVALID_BALANCE',
    });
  });

  it('enfileira o capital inicial quando está offline', async () => {
    const { settings, pending, service } = setup();
    settings.fail = true;

    const result = await service.saveInitialBalance(3000);

    expect(result.synced).toBe(false);
    expect(pending.jobs[0]).toEqual({ op: 'setInitialBalance', value: 3000 });
  });

  it('envia a fila pendente em ordem', async () => {
    const { trades, pending, service } = setup();
    const trade = seedTrade(trades);
    pending.jobs = [
      { op: 'deleteTrade', id: trade.id },
      {
        op: 'upsertTrade',
        trade: createTrade({
          id: 'queued',
          date: '2026-10-22',
          asset: 'EURUSD',
          type: 'Compra',
          lots: 1,
          pnl: 15,
        }),
      },
    ];

    const result = await service.flush();

    expect(result).toEqual({ pending: 0, flushed: 2 });
    expect(trades.items.map((item) => item.id)).toEqual(['queued']);
  });

  it('mantém na fila o que falhar durante o envio', async () => {
    const { trades, pending, service } = setup();
    pending.jobs = [
      {
        op: 'upsertTrade',
        trade: createTrade({
          id: 'a',
          date: '2026-10-21',
          asset: 'EURUSD',
          type: 'Compra',
          lots: 1,
          pnl: 1,
        }),
      },
      { op: 'deleteTrade', id: 'b' },
    ];
    trades.fail = true;

    const result = await service.flush();

    expect(result).toEqual({ pending: 2, flushed: 0 });
    expect(pending.jobs).toHaveLength(2);

    trades.fail = false;
    const retry = await service.flush();
    expect(retry.pending).toBe(0);
  });
});

describe('createAuthService', () => {
  it('faz login normalizando o e-mail', async () => {
    const auth = new FakeAuth();
    const service = createAuthService({ auth });

    await service.signIn('  samara@example.com ', 'segredo');

    expect(auth.signedInWith).toEqual({ email: 'samara@example.com', password: 'segredo' });
  });

  it('rejeita e-mail ou senha vazios', async () => {
    const auth = new FakeAuth();
    const service = createAuthService({ auth });

    await expect(service.signIn('', 'segredo')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    await expect(service.signIn('samara@example.com', '')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
  });
});
