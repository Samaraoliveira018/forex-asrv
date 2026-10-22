import { describe, expect, it } from 'vitest';
import {
  BREAK_EVEN_TOLERANCE,
  MAX_LOSS_RATIO,
  MAX_TRADES_PER_DAY,
  createTrade,
  isBreakEven,
  isIsoDate,
} from './trade';
import { DomainError } from './errors';

const input = {
  date: '2026-10-21',
  asset: ' eurusd ',
  type: 'Compra' as const,
  lots: 1,
  pnl: 10,
};

function expectDomainError(fn: () => unknown, code: string): void {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(code);
    return;
  }
  throw new Error(`Esperava DomainError ${code}`);
}

describe('createTrade', () => {
  it('normaliza o ativo, preenche observações e usa o id informado', () => {
    const trade = createTrade({ ...input, id: 'trade-1' });

    expect(trade).toEqual({
      id: 'trade-1',
      date: '2026-10-21',
      asset: 'EURUSD',
      type: 'Compra',
      lots: 1,
      pnl: 10,
      notes: '',
    });
  });

  it('gera um id quando nenhum é informado', () => {
    const trade = createTrade(input, { generateId: () => 'gerado' });

    expect(trade.id).toBe('gerado');
  });

  it('preserva observações e valores decimais', () => {
    const trade = createTrade({
      ...input,
      lots: 0.5,
      pnl: -12.34,
      notes: '  rompimento  ',
    });

    expect(trade.lots).toBe(0.5);
    expect(trade.pnl).toBe(-12.34);
    expect(trade.notes).toBe('rompimento');
  });

  it.each(['2026-13-01', '2026-02-31', '21/10/2026', '', '2026-1-1'])(
    'rejeita data inválida: %s',
    (date) => {
      expectDomainError(() => createTrade({ ...input, date }), 'INVALID_DATE');
    },
  );

  it('rejeita ativo vazio', () => {
    expectDomainError(() => createTrade({ ...input, asset: '   ' }), 'INVALID_ASSET');
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejeita lote inválido: %s',
    (lots) => {
      expectDomainError(() => createTrade({ ...input, lots }), 'INVALID_LOTS');
    },
  );

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejeita resultado inválido: %s',
    (pnl) => {
      expectDomainError(() => createTrade({ ...input, pnl }), 'INVALID_PNL');
    },
  );

  it('rejeita tipo de operação desconhecido', () => {
    expectDomainError(
      () => createTrade({ ...input, type: 'Swap' as never }),
      'INVALID_TYPE',
    );
  });
});

describe('isIsoDate', () => {
  it.each(['2026-10-21', '2024-02-29', '2000-01-01'])('aceita %s', (value) => {
    expect(isIsoDate(value)).toBe(true);
  });

  it.each(['2025-02-29', '2026-00-10', '2026-01-32', '2026-1-1', 'ontem', ''])(
    'rejeita %s',
    (value) => {
      expect(isIsoDate(value)).toBe(false);
    },
  );
});

describe('isBreakEven', () => {
  it('considera empate técnico dentro da tolerância', () => {
    expect(isBreakEven(-BREAK_EVEN_TOLERANCE)).toBe(true);
    expect(isBreakEven(BREAK_EVEN_TOLERANCE)).toBe(true);
    expect(isBreakEven(0)).toBe(true);
  });

  it('não considera empate fora da tolerância', () => {
    expect(isBreakEven(-0.31)).toBe(false);
    expect(isBreakEven(0.31)).toBe(false);
  });

  it('não considera NaN ou infinito como empate', () => {
    expect(isBreakEven(Number.NaN)).toBe(false);
    expect(isBreakEven(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe('regras de disciplina', () => {
  it('mantém os limites usados pelo app atual', () => {
    expect(MAX_TRADES_PER_DAY).toBe(2);
    expect(MAX_LOSS_RATIO).toBe(0.2);
    expect(BREAK_EVEN_TOLERANCE).toBe(0.3);
  });
});
