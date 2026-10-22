export type DomainErrorCode =
  | 'INVALID_DATE'
  | 'INVALID_ASSET'
  | 'INVALID_LOTS'
  | 'INVALID_PNL'
  | 'INVALID_TYPE'
  | 'INVALID_BALANCE'
  | 'INVALID_CREDENTIALS'
  | 'NO_TRADE_WITH_TRADES'
  | 'AUTH_REQUIRED';

export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'DomainError';
    this.code = code;
  }
}
