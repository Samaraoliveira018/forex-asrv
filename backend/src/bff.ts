import { createClient } from '@supabase/supabase-js';
import { createAuthService, type AuthService } from './application/auth';
import { createJournalService, type JournalService } from './application/journal';
import type { AuthSession, Clock } from './application/ports';
import { DomainError } from './domain/errors';
import {
  createSupabaseAuthGateway,
  createSupabaseNoTradeDayRepository,
  createSupabaseSettingsRepository,
  createSupabaseTradeRepository,
} from './infrastructure/supabaseAdapters';
import { createKeyValueQueue, type KeyValueStorage } from './infrastructure/storage';
import type { SupabaseClientLike } from './infrastructure/supabaseClient';

export interface BffConfig {
  url: string;
  anonKey: string;
  storage: KeyValueStorage;
  client?: SupabaseClientLike;
  clock?: Clock;
  queueKey?: string;
}

export interface Bff {
  auth: AuthService;
  journal: JournalService;
  /** Carrega a sessão persistida e libera o usuário atual para o diário. */
  ready(): Promise<AuthSession | null>;
}

export function createBff(config: BffConfig): Bff {
  const client: SupabaseClientLike =
    config.client ??
    (createClient(config.url, config.anonKey, {
      auth: {
        storage: config.storage,
        persistSession: true,
        autoRefreshToken: true,
      },
    }) as unknown as SupabaseClientLike);

  let currentUserId: string | null = null;

  const gateway = createSupabaseAuthGateway(client, (session) => {
    currentUserId = session?.userId ?? null;
  });

  const auth = createAuthService({ auth: gateway });

  const requireUserId = (): string => {
    if (!currentUserId) {
      throw new DomainError('AUTH_REQUIRED', 'Faça login para continuar.');
    }
    return currentUserId;
  };

  const base = createJournalService({
    trades: createSupabaseTradeRepository(client, requireUserId),
    noTradeDays: createSupabaseNoTradeDayRepository(client, requireUserId),
    settings: createSupabaseSettingsRepository(client, requireUserId),
    pending: createKeyValueQueue(config.storage, config.queueKey),
    clock: config.clock ?? { today: localToday },
  });

  const withSession = async <T>(operation: () => Promise<T>): Promise<T> => {
    const session = await auth.getSession();
    if (!session) {
      throw new DomainError('AUTH_REQUIRED', 'Faça login para continuar.');
    }
    return operation();
  };

  const journal: JournalService = {
    list: () => withSession(() => base.list()),
    saveTrade: (input) => withSession(() => base.saveTrade(input)),
    deleteTrade: (id) => withSession(() => base.deleteTrade(id)),
    registerNoTradeDay: (day) => withSession(() => base.registerNoTradeDay(day)),
    removeNoTradeDay: (day) => withSession(() => base.removeNoTradeDay(day)),
    saveInitialBalance: (value) => withSession(() => base.saveInitialBalance(value)),
    pendingCount: () => base.pendingCount(),
    flush: () => withSession(() => base.flush()),
  };

  return {
    auth,
    journal,
    ready: () => auth.getSession(),
  };
}

function localToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
