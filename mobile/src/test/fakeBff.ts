import {
  calculateStats,
  createTrade,
  evaluateDiscipline,
  type AuthSession,
  type Bff,
  type JournalSnapshot,
  type Trade,
  type TradeInput,
} from '@asrv/backend';

export interface FakeBffOptions {
  session?: AuthSession | null;
  snapshot?: JournalSnapshot;
}

export function emptySnapshot(trades: Trade[] = [], noTradeDays: string[] = []): JournalSnapshot {
  const initialBalance = 1000;
  const today = localToday();

  return {
    trades,
    noTradeDays,
    initialBalance,
    stats: calculateStats({ trades, initialBalance, today }),
    discipline: evaluateDiscipline({ trades, noTradeDays, initialBalance }),
  };
}

export function createFakeBff(options: FakeBffOptions = {}) {
  const state: { session: AuthSession | null; snapshot: JournalSnapshot } = {
    session: options.session ?? null,
    snapshot: options.snapshot ?? emptySnapshot(),
  };

  const getSession = jest.fn(async () => state.session);
  const signIn = jest.fn(async (email: string) => {
    state.session = { userId: 'user-1', email };
    return state.session;
  });
  const signOut = jest.fn(async () => {
    state.session = null;
  });
  const onChange = jest.fn(() => () => undefined);

  const list = jest.fn(async () => state.snapshot);

  const saveTrade = jest.fn(async (input: TradeInput) => {
    const trade = createTrade(input);
    state.snapshot = emptySnapshot([...state.snapshot.trades, trade], state.snapshot.noTradeDays);
    return { trade, synced: true, warnings: [] as string[] };
  });

  const deleteTrade = jest.fn(async (id: string) => {
    state.snapshot = emptySnapshot(
      state.snapshot.trades.filter((trade) => trade.id !== id),
      state.snapshot.noTradeDays,
    );
    return { synced: true };
  });

  const registerNoTradeDay = jest.fn(async (day: string) => {
    state.snapshot = emptySnapshot(state.snapshot.trades, [...state.snapshot.noTradeDays, day]);
    return { synced: true };
  });

  const removeNoTradeDay = jest.fn(async (day: string) => {
    state.snapshot = emptySnapshot(
      state.snapshot.trades,
      state.snapshot.noTradeDays.filter((item) => item !== day),
    );
    return { synced: true };
  });

  const saveInitialBalance = jest.fn(async (value: number) => {
    state.snapshot = {
      ...emptySnapshot(state.snapshot.trades, state.snapshot.noTradeDays),
      initialBalance: value,
    };
    return { synced: true };
  });

  const pendingCount = jest.fn(async () => 0);
  const flush = jest.fn(async () => ({ pending: 0, flushed: 0 }));

  const bff = {
    auth: { getSession, signIn, signOut, onChange },
    journal: {
      list,
      saveTrade,
      deleteTrade,
      registerNoTradeDay,
      removeNoTradeDay,
      saveInitialBalance,
      pendingCount,
      flush,
    },
    ready: getSession,
  } as unknown as Bff;

  return {
    bff,
    state,
    mocks: {
      getSession,
      signIn,
      signOut,
      onChange,
      list,
      saveTrade,
      deleteTrade,
      registerNoTradeDay,
      removeNoTradeDay,
      saveInitialBalance,
      pendingCount,
      flush,
    },
  };
}

export function localToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
