import type { Trade } from '../domain/trade';

export interface AuthSession {
  userId: string;
  email: string;
}

export interface TradeRepository {
  list(): Promise<Trade[]>;
  upsert(trade: Trade): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface NoTradeDayRepository {
  list(): Promise<string[]>;
  add(day: string): Promise<void>;
  remove(day: string): Promise<void>;
}

export interface SettingsRepository {
  getInitialBalance(): Promise<number>;
  setInitialBalance(value: number): Promise<void>;
}

export interface AuthGateway {
  getSession(): Promise<AuthSession | null>;
  signIn(email: string, password: string): Promise<AuthSession>;
  signOut(): Promise<void>;
  onChange(callback: (session: AuthSession | null) => void): () => void;
}

export interface Clock {
  today(): string;
}

export type PendingJob =
  | { op: 'upsertTrade'; trade: Trade }
  | { op: 'deleteTrade'; id: string }
  | { op: 'addNoTradeDay'; day: string }
  | { op: 'removeNoTradeDay'; day: string }
  | { op: 'setInitialBalance'; value: number };

export interface PendingJobStorage {
  read(): Promise<PendingJob[]>;
  write(jobs: PendingJob[]): Promise<void>;
}
