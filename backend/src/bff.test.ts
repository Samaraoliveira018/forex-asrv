import { describe, expect, it } from 'vitest';
import { createBff } from './bff';
import type { KeyValueStorage } from './infrastructure/storage';
import { FakeSupabase } from './test/fakeSupabase';

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function setup() {
  const client = new FakeSupabase();
  const storage = new MemoryStorage();
  const bff = createBff({
    url: 'https://exemplo.supabase.co',
    anonKey: 'chave-publica',
    storage,
    client,
  });

  return { client, storage, bff };
}

describe('createBff', () => {
  it('exige login antes de acessar o diário', async () => {
    const { bff } = setup();

    expect(await bff.ready()).toBeNull();
    await expect(bff.journal.list()).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
  });

  it('entrega o retrato do diário depois do login', async () => {
    const { client, bff } = setup();
    client.tables.trades.push({
      user_id: 'user-1',
      id: 't1',
      date: '2026-10-21',
      asset: 'EURUSD',
      type: 'Compra',
      lots: 1,
      pnl: 100,
      notes: '',
    });

    await bff.auth.signIn('samara@example.com', 'segredo');
    const snapshot = await bff.journal.list();

    expect(snapshot.trades).toHaveLength(1);
    expect(snapshot.initialBalance).toBe(150);
    expect(snapshot.stats.totalPnl).toBe(100);
  });

  it('salva a operação com o usuário da sessão', async () => {
    const { client, bff } = setup();
    await bff.auth.signIn('samara@example.com', 'segredo');

    const result = await bff.journal.saveTrade({
      id: 't1',
      date: '2026-10-21',
      asset: 'eurusd',
      type: 'Compra',
      lots: 1,
      pnl: 15,
    });

    expect(result.synced).toBe(true);
    expect(client.tables.trades).toEqual([
      expect.objectContaining({ user_id: 'user-1', id: 't1', asset: 'EURUSD', pnl: 15 }),
    ]);
  });

  it('enfileira offline e sincroniza quando a conexão volta', async () => {
    const { client, storage, bff } = setup();
    await bff.auth.signIn('samara@example.com', 'segredo');
    client.offline = true;

    const result = await bff.journal.saveTrade({
      id: 'offline-1',
      date: '2026-10-21',
      asset: 'EURUSD',
      type: 'Compra',
      lots: 1,
      pnl: 15,
    });

    expect(result.synced).toBe(false);
    expect(await bff.journal.pendingCount()).toBe(1);
    expect(storage.getItem('asrv:pending')).toContain('offline-1');

    client.offline = false;
    expect(await bff.journal.flush()).toEqual({ pending: 0, flushed: 1 });
    expect(client.tables.trades[0]).toMatchObject({ id: 'offline-1', user_id: 'user-1' });
  });

  it('propaga credenciais inválidas', async () => {
    const { bff } = setup();

    await expect(bff.auth.signIn('samara@example.com', 'senha-errada')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
  });
});
