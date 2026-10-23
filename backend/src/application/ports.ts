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

/**
 * Armazena os prints das operações no Supabase Storage.
 * O adaptador é responsável por isolar os objetos por usuário.
 */
export interface ScreenshotStorage {
  /** Sobe a imagem (data URL em base64) e devolve o caminho salvo no bucket. */
  upload(tradeId: string, dataUrl: string): Promise<string>;
  /** Gera URLs assinadas (temporárias) para exibir os prints. */
  signedUrls(paths: readonly string[]): Promise<Record<string, string>>;
  /** Remove o print de uma operação. */
  remove(tradeId: string): Promise<void>;
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
  | { op: 'upsertTrade'; trade: Trade; screenshotDataUrl?: string }
  | { op: 'deleteTrade'; id: string }
  | { op: 'addNoTradeDay'; day: string }
  | { op: 'removeNoTradeDay'; day: string }
  | { op: 'setInitialBalance'; value: number };

export interface PendingJobStorage {
  read(): Promise<PendingJob[]>;
  write(jobs: PendingJob[]): Promise<void>;
}
