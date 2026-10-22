import { DomainError } from './errors';

export const MAX_TRADES_PER_DAY = 2;
export const MAX_LOSS_RATIO = 0.2;
export const BREAK_EVEN_TOLERANCE = 0.3;

export type TradeType = 'Compra' | 'Venda';

export interface Trade {
  id: string;
  date: string;
  asset: string;
  type: TradeType;
  lots: number;
  pnl: number;
  notes: string;
}

export interface TradeInput {
  id?: string;
  date: string;
  asset: string;
  type: TradeType;
  lots: number;
  pnl: number;
  notes?: string;
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
    lots: input.lots,
    pnl: input.pnl,
    notes: input.notes?.trim() ?? '',
  };
}

function defaultId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
