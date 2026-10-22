export type BackendErrorCode =
  | 'AUTH_SESSION_FAILED'
  | 'SIGN_IN_FAILED'
  | 'SIGN_OUT_FAILED'
  | 'AUTH_LISTEN_FAILED'
  | 'TRADES_READ_FAILED'
  | 'TRADES_WRITE_FAILED'
  | 'TRADES_DELETE_FAILED'
  | 'NO_TRADE_READ_FAILED'
  | 'NO_TRADE_WRITE_FAILED'
  | 'NO_TRADE_DELETE_FAILED'
  | 'SETTINGS_READ_FAILED'
  | 'SETTINGS_WRITE_FAILED'
  | 'MAPPING_FAILED';

export class BackendError extends Error {
  readonly code: BackendErrorCode;

  constructor(code: BackendErrorCode, message: string) {
    super(message);
    this.name = 'BackendError';
    this.code = code;
  }
}
