import { describe, expect, it } from 'vitest';
import { createKeyValueQueue, type KeyValueStorage } from './storage';
import type { PendingJob } from '../application/ports';

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

describe('createKeyValueQueue', () => {
  const job: PendingJob = { op: 'deleteTrade', id: 't1' };

  it('grava e lê a fila', async () => {
    const storage = new MemoryStorage();
    const queue = createKeyValueQueue(storage);

    await queue.write([job]);

    expect(await queue.read()).toEqual([job]);
    expect(storage.getItem('asrv:pending')).toBe(JSON.stringify([job]));
  });

  it('devolve fila vazia quando a chave não existe', async () => {
    const queue = createKeyValueQueue(new MemoryStorage());

    expect(await queue.read()).toEqual([]);
  });

  it('ignora conteúdo corrompido em vez de quebrar o app', async () => {
    const storage = new MemoryStorage();
    storage.setItem('asrv:pending', '{invalido');

    const queue = createKeyValueQueue(storage);

    expect(await queue.read()).toEqual([]);
  });

  it('ignora payload que não é lista', async () => {
    const storage = new MemoryStorage();
    storage.setItem('asrv:pending', JSON.stringify({ op: 'deleteTrade' }));

    expect(await createKeyValueQueue(storage).read()).toEqual([]);
  });

  it('aceita chave customizada', async () => {
    const storage = new MemoryStorage();
    const queue = createKeyValueQueue(storage, 'outra:fila');

    await queue.write([job]);
    expect(storage.getItem('outra:fila')).toBeTruthy();
    expect(storage.getItem('asrv:pending')).toBeNull();
  });

  it('funciona com storage assíncrono (mobile)', async () => {
    class AsyncStorage implements KeyValueStorage {
      values = new Map<string, string>();

      async getItem(key: string): Promise<string | null> {
        return this.values.get(key) ?? null;
      }

      async setItem(key: string, value: string): Promise<void> {
        this.values.set(key, value);
      }

      async removeItem(key: string): Promise<void> {
        this.values.delete(key);
      }
    }

    const storage = new AsyncStorage();
    const queue = createKeyValueQueue(storage);

    await queue.write([job]);

    expect(await queue.read()).toEqual([job]);
  });
});
