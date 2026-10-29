import { DomainError } from './errors';

/**
 * Máximo de operações por sessão (dia ou noite) que contam para a disciplina.
 * Break even não entra na contagem (ver `isBreakEven`).
 */
export const MAX_TRADES_PER_SESSION = 4;

/**
 * Máximo de stops (operações com perda real) por sessão (dia ou noite).
 * Ao atingir o limite, o correto é parar de operar naquela sessão para preservar a ofensiva.
 */
export const MAX_STOPS_PER_SESSION = 2;
export const MAX_LOSS_RATIO = 0.25;
export const BREAK_EVEN_TOLERANCE = 0.3;

export type TradeType = 'Compra' | 'Venda';

/** Sessão do mercado: abertura da manhã (`day`) ou da noite (`night`). */
export type TradeSession = 'day' | 'night';

export interface Trade {
  id: string;
  date: string;
  asset: string;
  type: TradeType;
  /** Sessão em que a operação foi feita. */
  session: TradeSession;
  lots: number;
  pnl: number;
  notes: string;
  /** Caminho do print no bucket do Supabase Storage ('' quando não há print). */
  screenshotPath: string;
}

export interface TradeInput {
  id?: string;
  date: string;
  asset: string;
  type: TradeType;
  /** Ausente em registros antigos: assume `day`. */
  session?: TradeSession;
  lots: number;
  pnl: number;
  notes?: string;
  screenshotPath?: string;
}

export interface CreateTradeOptions {
  generateId?: () => string;
}

export function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isBreakEven(pnl: number): boolean {
  return Number.isFinite(pnl) && Math.abs(pnl) <= BREAK_EVEN_TOLERANCE;
}

/** Stop = perda real (fora da tolerância de break even). */
export function isStop(pnl: number): boolean {
  return Number.isFinite(pnl) && pnl < 0 && !isBreakEven(pnl);
}

/** Nome curto da sessão para exibição. */
export function sessionLabel(session: TradeSession): string {
  return session === 'night' ? 'Noite' : 'Dia';
}

export function createTrade(input: TradeInput, options: CreateTradeOptions = {}): Trade {
  if (!isIsoDate(input.date)) {
    throw new DomainError('INVALID_DATE', 'Data da operação inválida.');
  }

  const asset = input.asset.trim().toUpperCase();
  if (!asset) {
    throw new DomainError('INVALID_ASSET', 'Informe o ativo da operação.');
  }

  if (input.type !== 'Compra' && input.type !== 'Venda') {
    throw new DomainError('INVALID_TYPE', 'Tipo da operação inválido.');
  }

  const session = normalizeSession(input.session);

  if (!Number.isFinite(input.lots) || input.lots <= 0) {
    throw new DomainError('INVALID_LOTS', 'A quantidade de lotes deve ser maior que zero.');
  }

  if (!Number.isFinite(input.pnl)) {
    throw new DomainError('INVALID_PNL', 'O resultado da operação deve ser um número.');
  }

  const id = input.id?.trim() || options.generateId?.() || defaultId();

  return {
    id,
    date: input.date,
    asset,
    type: input.type,
    session,
    lots: input.lots,
    pnl: input.pnl,
    notes: input.notes?.trim() ?? '',
    screenshotPath: normalizeScreenshotPath(input.screenshotPath),
  };
}

/** Registros antigos (sem sessão) contam como sessão do dia. */
function normalizeSession(value: TradeSession | string | undefined): TradeSession {
  if (!value) return 'day';
  if (value !== 'day' && value !== 'night') {
    throw new DomainError('INVALID_SESSION', 'Sessão da operação inválida.');
  }
  return value;
}

function normalizeScreenshotPath(value: string | undefined): string {
  const path = value?.trim() ?? '';
  if (!path || path.includes('..')) return '';
  return path.replace(/^\/+/, '');
}

function defaultId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
