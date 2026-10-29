export { DomainError } from './domain/errors';
export type { DomainErrorCode } from './domain/errors';

export {
  BREAK_EVEN_TOLERANCE,
  MAX_LOSS_RATIO,
  MAX_STOPS_PER_SESSION,
  MAX_TRADES_PER_SESSION,
  createTrade,
  isBreakEven,
  isIsoDate,
  isStop,
  sessionLabel,
} from './domain/trade';
export type { Trade, TradeInput, TradeSession, TradeType } from './domain/trade';

export { calculateStreak, evaluateDiscipline } from './domain/discipline';
export type { DisciplineInput, DisciplineResult, Violation, ViolationKind } from './domain/discipline';

export { calculateStats } from './domain/stats';
export type {
  PeriodResult,
  PeriodResults,
  SessionCounters,
  Stats,
  StatsInput,
} from './domain/stats';

export { createAuthService } from './application/auth';
export type { AuthService } from './application/auth';

export { createJournalService } from './application/journal';
export type {
  JournalDeps,
  JournalService,
  JournalSnapshot,
  SaveTradeResult,
  SyncResult,
} from './application/journal';

export type {
  AuthGateway,
  AuthSession,
  Clock,
  NoTradeDayRepository,
  PendingJob,
  PendingJobStorage,
  ScreenshotStorage,
  SettingsRepository,
  TradeRepository,
} from './application/ports';

export { createBff } from './bff';
export type { Bff, BffConfig } from './bff';

export { BackendError } from './infrastructure/errors';
export type { BackendErrorCode } from './infrastructure/errors';

export {
  SCREENSHOT_BUCKET,
  createSupabaseAuthGateway,
  createSupabaseNoTradeDayRepository,
  createSupabaseScreenshotStorage,
  createSupabaseSettingsRepository,
  createSupabaseTradeRepository,
} from './infrastructure/supabaseAdapters';

export type { SupabaseClientLike, SupabaseErrorLike } from './infrastructure/supabaseClient';

export { PENDING_QUEUE_KEY, createKeyValueQueue } from './infrastructure/storage';
export type { KeyValueStorage } from './infrastructure/storage';
