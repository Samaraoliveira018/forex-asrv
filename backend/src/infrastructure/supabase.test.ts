import { describe, expect, it } from 'vitest';
import { FakeSupabase } from '../test/fakeSupabase';
import {
  createSupabaseAuthGateway,
  createSupabaseNoTradeDayRepository,
  createSupabaseSettingsRepository,
  createSupabaseTradeRepository,
} from './supabaseAdapters';

function repositories(client: FakeSupabase, userId = 'user-1') {
  return {
    trades: createSupabaseTradeRepository(client, () => userId),
    noTradeDays: createSupabaseNoTradeDayRepository(client, () => userId),
    settings: createSupabaseSettingsRepository(client, () => userId),
  };
}

describe('SupabaseTradeRepository', () => {
  it('lista as operações do usuário em ordem de data e normaliza números', async () => {
    const client = new FakeSupabase();
    client.tables.trades.push(
      {
        user_id: 'user-1',
        id: 't2',
        date: '2026-10-02',
        asset: 'GBPUSD',
        type: 'Venda',
        lots: '0.5',
        pnl: '-10.5',
        notes: null,
      },
      {
        user_id: 'user-1',
        id: 't1',
        date: '2026-10-01',
        asset: 'EURUSD',
        type: 'Compra',
        lots: '1',
        pnl: '20',
        notes: 'ok',
      },
      {
        user_id: 'outro',
        id: 'x',
        date: '2026-10-01',
        asset: 'EURUSD',
        type: 'Compra',
        lots: 1,
        pnl: 99,
        notes: '',
      },
    );

    const trades = await repositories(client).trades.list();

    expect(trades.map((trade) => trade.id)).toEqual(['t1', 't2']);
    expect(trades[1]).toEqual({
      id: 't2',
      date: '2026-10-02',
      asset: 'GBPUSD',
      type: 'Venda',
      lots: 0.5,
      pnl: -10.5,
      notes: '',
    });
  });

  it('faz upsert com user_id e conflito composto', async () => {
    const client = new FakeSupabase();

    await repositories(client).trades.upsert({
      id: 't1',
      date: '2026-10-01',
      asset: 'EURUSD',
      type: 'Compra',
      lots: 1,
      pnl: 10,
      notes: '',
    });

    expect(client.tables.trades).toEqual([
      expect.objectContaining({ user_id: 'user-1', id: 't1', pnl: 10 }),
    ]);

    await repositories(client).trades.upsert({
      id: 't1',
      date: '2026-10-01',
      asset: 'EURUSD',
      type: 'Compra',
      lots: 1,
      pnl: 25,
      notes: 'editado',
    });

    expect(client.tables.trades).toHaveLength(1);
    expect(client.tables.trades[0]).toMatchObject({ pnl: 25, notes: 'editado' });
  });

  it('exclui pelo id do usuário', async () => {
    const client = new FakeSupabase();
    client.tables.trades.push(
      { user_id: 'user-1', id: 't1', date: '2026-10-01', asset: 'EURUSD', type: 'Compra', lots: 1, pnl: 1, notes: '' },
      { user_id: 'outro', id: 't1', date: '2026-10-01', asset: 'EURUSD', type: 'Compra', lots: 1, pnl: 1, notes: '' },
    );

    await repositories(client).trades.remove('t1');

    expect(client.tables.trades).toHaveLength(1);
    expect(client.tables.trades[0]?.user_id).toBe('outro');
  });

  it('traduz erro de leitura em BackendError', async () => {
    const client = new FakeSupabase();
    client.offline = true;

    await expect(repositories(client).trades.list()).rejects.toMatchObject({
      code: 'TRADES_READ_FAILED',
    });
  });
});

describe('SupabaseNoTradeDayRepository', () => {
  it('lista, adiciona sem duplicar e remove dias', async () => {
    const client = new FakeSupabase();
    const repository = repositories(client).noTradeDays;

    await repository.add('2026-10-01');
    await repository.add('2026-10-01');
    await repository.add('2026-10-02');

    expect(await repository.list()).toEqual(['2026-10-01', '2026-10-02']);

    await repository.remove('2026-10-01');
    expect(await repository.list()).toEqual(['2026-10-02']);
  });
});

describe('SupabaseSettingsRepository', () => {
  it('usa 150 como capital padrão quando não há configuração', async () => {
    const client = new FakeSupabase();

    expect(await repositories(client).settings.getInitialBalance()).toBe(150);
  });

  it('lê e salva o capital inicial', async () => {
    const client = new FakeSupabase();
    const repository = repositories(client).settings;

    await repository.setInitialBalance(2500);
    expect(await repository.getInitialBalance()).toBe(2500);

    await repository.setInitialBalance(3000);
    expect(await repository.getInitialBalance()).toBe(3000);
    expect(client.tables.settings).toHaveLength(1);
  });
});

describe('SupabaseAuthGateway', () => {
  it('faz login e devolve a sessão mapeada', async () => {
    const client = new FakeSupabase();
    const gateway = createSupabaseAuthGateway(client);

    const session = await gateway.signIn('samara@example.com', 'segredo');

    expect(session).toEqual({ userId: 'user-1', email: 'samara@example.com' });
    expect(await gateway.getSession()).toEqual(session);
  });

  it('traduz credenciais inválidas em DomainError', async () => {
    const client = new FakeSupabase();
    const gateway = createSupabaseAuthGateway(client);

    await expect(gateway.signIn('samara@example.com', 'senha-errada')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('devolve null quando não há sessão', async () => {
    const client = new FakeSupabase();
    const gateway = createSupabaseAuthGateway(client);

    expect(await gateway.getSession()).toBeNull();
  });

  it('avisa mudanças de autenticação e permite cancelar', async () => {
    const client = new FakeSupabase();
    const gateway = createSupabaseAuthGateway(client);
    const seen: Array<{ userId: string } | null> = [];
    const unsubscribe = gateway.onChange((session) => seen.push(session));

    await gateway.signIn('samara@example.com', 'segredo');
    await gateway.signOut();
    unsubscribe();
    await gateway.signIn('samara@example.com', 'segredo');

    expect(seen).toEqual([
      { userId: 'user-1', email: 'samara@example.com' },
      null,
    ]);
  });
});
