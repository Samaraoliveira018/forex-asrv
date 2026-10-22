import type { PendingJob, PendingJobStorage } from '../application/ports';

export interface KeyValueStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

export const PENDING_QUEUE_KEY = 'asrv:pending';

export function createKeyValueQueue(
  storage: KeyValueStorage,
  key: string = PENDING_QUEUE_KEY,
): PendingJobStorage {
  return {
    async read() {
      const raw = await storage.getItem(key);
      if (!raw) return [];

      try {
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as PendingJob[]) : [];
      } catch {
        return [];
      }
    },

    async write(jobs) {
      await storage.setItem(key, JSON.stringify(jobs));
    },
  };
}
