import type {
  AuthGateway,
  AuthSession,
  NoTradeDayRepository,
  SettingsRepository,
  TradeRepository,
} from '../application/ports';
import { DomainError } from '../domain/errors';
import type { Trade } from '../domain/trade';
import { BackendError, type BackendErrorCode } from './errors';
import type { SupabaseClientLike } from './supabaseClient';

const DEFAULT_INITIAL_BALANCE = 150;

type TradeRow = {
  id: string;
  date: string;
  asset: string;
  type: string;
  lots: number | string;
  pnl: number | string;
  notes: string | null;
};

export function createSupabaseTradeRepository(
  client: SupabaseClientLike,
  getUserId: () => string,
): TradeRepository {
  return {
    async list() {
      return guard('TRADES_READ_FAILED', async () => {
        const { data, error } = await client
          .from('trades')
          .select('id,date,asset,type,lots,pnl,notes')
          .eq('user_id', getUserId())
          .order('date', { ascending: true });

        if (error) throw new BackendError('TRADES_READ_FAILED', error.message);
        return ((data ?? []) as TradeRow[]).map(toTrade);
      });
    },

    async upsert(trade) {
      await guard('TRADES_WRITE_FAILED', async () => {
        const { error } = await client.from('trades').upsert(
          {
            user_id: getUserId(),
            id: trade.id,
            date: trade.date,
            asset: trade.asset,
            type: trade.type,
            lots: trade.lots,
            pnl: trade.pnl,
            notes: trade.notes,
          },
          { onConflict: 'user_id,id' },
        );

        if (error) throw new BackendError('TRADES_WRITE_FAILED', error.message);
      });
    },

    async remove(id) {
      await guard('TRADES_DELETE_FAILED', async () => {
        const { error } = await client
          .from('trades')
          .delete()
          .eq('user_id', getUserId())
          .eq('id', id);

        if (error) throw new BackendError('TRADES_DELETE_FAILED', error.message);
      });
    },
  };
}

export function createSupabaseNoTradeDayRepository(
  client: SupabaseClientLike,
  getUserId: () => string,
): NoTradeDayRepository {
  return {
    async list() {
      return guard('NO_TRADE_READ_FAILED', async () => {
        const { data, error } = await client
          .from('no_trade_days')
          .select('day')
          .eq('user_id', getUserId())
          .order('day', { ascending: true });

        if (error) throw new BackendError('NO_TRADE_READ_FAILED', error.message);
        return ((data ?? []) as Array<{ day: string }>).map((row) => row.day);
      });
    },

    async add(day) {
      await guard('NO_TRADE_WRITE_FAILED', async () => {
        const { error } = await client.from('no_trade_days').upsert(
          { user_id: getUserId(), day },
          { onConflict: 'user_id,day', ignoreDuplicates: true },
        );

        if (error) throw new BackendError('NO_TRADE_WRITE_FAILED', error.message);
      });
    },

    async remove(day) {
      await guard('NO_TRADE_DELETE_FAILED', async () => {
        const { error } = await client
          .from('no_trade_days')
          .delete()
          .eq('user_id', getUserId())
          .eq('day', day);

        if (error) throw new BackendError('NO_TRADE_DELETE_FAILED', error.message);
      });
    },
  };
}

export function createSupabaseSettingsRepository(
  client: SupabaseClientLike,
  getUserId: () => string,
): SettingsRepository {
  return {
    async getInitialBalance() {
      return guard('SETTINGS_READ_FAILED', async () => {
        const { data, error } = await client
          .from('settings')
          .select('initial_balance')
          .eq('user_id', getUserId())
          .maybeSingle();

        if (error) throw new BackendError('SETTINGS_READ_FAILED', error.message);
        if (!data) return DEFAULT_INITIAL_BALANCE;

        const value = Number((data as { initial_balance: number | string }).initial_balance);
        return Number.isFinite(value) ? value : DEFAULT_INITIAL_BALANCE;
      });
    },

    async setInitialBalance(value) {
      await guard('SETTINGS_WRITE_FAILED', async () => {
        const { error } = await client
          .from('settings')
          .upsert({ user_id: getUserId(), initial_balance: value }, { onConflict: 'user_id' });

        if (error) throw new BackendError('SETTINGS_WRITE_FAILED', error.message);
      });
    },
  };
}

export function createSupabaseAuthGateway(
  client: SupabaseClientLike,
  onSession?: (session: AuthSession | null) => void,
): AuthGateway {
  return {
    async getSession() {
      const session = await guard('AUTH_SESSION_FAILED', async () => {
        const { data, error } = await client.auth.getSession();
        if (error) throw new BackendError('AUTH_SESSION_FAILED', error.message);
        return mapSession(data?.session ?? null);
      });

      onSession?.(session);
      return session;
    },

    async signIn(email, password) {
      const session = await guard('SIGN_IN_FAILED', async () => {
        const { data, error } = await client.auth.signInWithPassword({ email, password });

        if (error) {
          if (/invalid login credentials/i.test(error.message)) {
            throw new DomainError('INVALID_CREDENTIALS', 'E-mail ou senha inválidos.');
          }
          if (/email not confirmed/i.test(error.message)) {
            throw new DomainError('INVALID_CREDENTIALS', 'Confirme seu e-mail antes de entrar.');
          }
          throw new BackendError('SIGN_IN_FAILED', error.message);
        }

        const mapped = mapSession(data?.session ?? null);
        if (!mapped) throw new BackendError('SIGN_IN_FAILED', 'Não foi possível iniciar a sessão.');
        return mapped;
      });

      onSession?.(session);
      return session;
    },

    async signOut() {
      await guard('SIGN_OUT_FAILED', async () => {
        const { error } = await client.auth.signOut();
        if (error) throw new BackendError('SIGN_OUT_FAILED', error.message);
      });

      onSession?.(null);
    },

    onChange(callback) {
      const { data } = client.auth.onAuthStateChange((_event, rawSession) => {
        const session = mapSession(rawSession);
        onSession?.(session);
        callback(session);
      });

      return () => data.subscription.unsubscribe();
    },
  };
}

async function guard<T>(code: BackendErrorCode, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof BackendError || error instanceof DomainError) throw error;
    throw new BackendError(code, error instanceof Error ? error.message : 'Falha inesperada.');
  }
}

function mapSession(raw: unknown): AuthSession | null {
  if (!raw || typeof raw !== 'object') return null;

  const user = (raw as { user?: { id?: string; email?: string } }).user;
  if (!user?.id) return null;

  return { userId: user.id, email: user.email ?? '' };
}

function toTrade(row: TradeRow): Trade {
  const lots = Number(row.lots);
  const pnl = Number(row.pnl);

  if (
    !row.id ||
    !row.date ||
    !row.asset ||
    (row.type !== 'Compra' && row.type !== 'Venda') ||
    !Number.isFinite(lots) ||
    !Number.isFinite(pnl)
  ) {
    throw new BackendError('MAPPING_FAILED', 'Operação inválida recebida do banco.');
  }

  return {
    id: row.id,
    date: row.date,
    asset: row.asset,
    type: row.type,
    lots,
    pnl,
    notes: row.notes ?? '',
  };
}
