import { describe, expect, it } from 'vitest';
import { createTrade, type Trade } from './trade';
import { calculateStreak, evaluateDiscipline } from './discipline';

let sequence = 0;

function trade(overrides: Partial<Parameters<typeof createTrade>[0]> = {}): Trade {
  sequence += 1;
  return createTrade({
    id: `trade-${sequence}`,
    date: '2026-10-01',
    asset: 'EURUSD',
    type: 'Compra',
    lots: 1,
    pnl: 10,
    ...overrides,
  });
}

describe('evaluateDiscipline', () => {
  it('conta dias distintos com operação ou sem operação', () => {
    const result = evaluateDiscipline({
      trades: [
        trade({ date: '2026-10-01' }),
        trade({ date: '2026-10-01' }),
        trade({ date: '2026-10-02' }),
      ],
      noTradeDays: ['2026-10-03'],
      initialBalance: 1000,
    });

    expect(result.violations).toEqual([]);
    expect(result.streak).toBe(3);
  });

  it('não conta o mesmo dia sem operação duas vezes', () => {
    const result = evaluateDiscipline({
      trades: [],
      noTradeDays: ['2026-10-01', '2026-10-01', '2026-10-02'],
      initialBalance: 1000,
    });

    expect(result.streak).toBe(2);
  });

  it('viola ao passar de quatro trades válidos no mesmo dia e zera a ofensiva', () => {
    const result = evaluateDiscipline({
      trades: [
        trade({ date: '2026-10-01' }),
        trade({ date: '2026-10-01' }),
        trade({ date: '2026-10-01' }),
        trade({ date: '2026-10-01' }),
        trade({ date: '2026-10-01' }),
      ],
      noTradeDays: ['2026-10-02', '2026-10-03'],
      initialBalance: 1000,
    });

    expect(result.streak).toBe(0);
    expect(result.violations).toContainEqual(
      expect.objectContaining({ kind: 'TOO_MANY_TRADES', date: '2026-10-01' }),
    );
  });

  it('não conta operações break even no limite diário', () => {
    const result = evaluateDiscipline({
      trades: [
        trade({ date: '2026-10-01' }),
        trade({ date: '2026-10-01' }),
        trade({ date: '2026-10-01' }),
        trade({ date: '2026-10-01' }),
        trade({ date: '2026-10-01', pnl: 0 }),
        trade({ date: '2026-10-01', pnl: 0.2 }),
        trade({ date: '2026-10-01', pnl: -0.3 }),
      ],
      noTradeDays: [],
      initialBalance: 1000,
    });

    expect(result.violations).toEqual([]);
    expect(result.streak).toBe(1);
  });

  it('viola quando a perda individual passa de 25% do saldo inicial do dia', () => {
    const result = evaluateDiscipline({
      trades: [trade({ date: '2026-10-01', pnl: -250.01 })],
      noTradeDays: [],
      initialBalance: 1000,
    });

    expect(result.streak).toBe(0);
    expect(result.violations).toContainEqual(
      expect.objectContaining({ kind: 'LOSS_OVER_LIMIT', date: '2026-10-01' }),
    );
  });

  it('não viola quando a perda é exatamente 25% do saldo inicial do dia', () => {
    const result = evaluateDiscipline({
      trades: [trade({ date: '2026-10-01', pnl: -250 })],
      noTradeDays: [],
      initialBalance: 1000,
    });

    expect(result.violations).toEqual([]);
    expect(result.streak).toBe(1);
  });

  it('usa o saldo de abertura do dia como base (resultado dos dias anteriores)', () => {
    const result = evaluateDiscipline({
      trades: [
        trade({ date: '2026-10-01', pnl: 500 }),
        trade({ date: '2026-10-02', pnl: -300 }),
      ],
      noTradeDays: [],
      initialBalance: 1000,
    });

    // O dia 02 abre com 1500, então o limite é 375. A perda de 300 está dentro.
    expect(result.violations).toEqual([]);
    expect(result.streak).toBe(2);
  });

  it('viola quando a perda passa de 25% do saldo de abertura do dia', () => {
    const result = evaluateDiscipline({
      trades: [
        trade({ date: '2026-10-01', pnl: 500 }),
        trade({ date: '2026-10-02', pnl: -375.01 }),
      ],
      noTradeDays: [],
      initialBalance: 1000,
    });

    expect(result.streak).toBe(0);
    expect(result.violations).toContainEqual(
      expect.objectContaining({ kind: 'LOSS_OVER_LIMIT', date: '2026-10-02' }),
    );
  });

  it('não trata perda dentro do empate técnico como violação', () => {
    const result = evaluateDiscipline({
      trades: [trade({ date: '2026-10-01', pnl: -0.3 })],
      noTradeDays: [],
      initialBalance: 1,
    });

    expect(result.violations).toEqual([]);
    expect(result.streak).toBe(1);
  });

  it('viola quando o patrimônio fica zerado ou negativo', () => {
    const result = evaluateDiscipline({
      trades: [
        trade({ date: '2026-10-01', pnl: -400 }),
        trade({ date: '2026-10-02', pnl: -100 }),
      ],
      noTradeDays: [],
      initialBalance: 500,
    });

    expect(result.streak).toBe(0);
    expect(result.violations).toContainEqual(
      expect.objectContaining({ kind: 'BALANCE_DEPLETED' }),
    );
  });

  it('mantém a ofensiva vazia quando não há registros', () => {
    const result = evaluateDiscipline({
      trades: [],
      noTradeDays: [],
      initialBalance: 1000,
    });

    expect(result.streak).toBe(0);
    expect(result.violations).toEqual([]);
  });
});

describe('calculateStreak', () => {
  it('delega para a avaliação de disciplina', () => {
    const trades = [trade({ date: '2026-10-01' }), trade({ date: '2026-10-02' })];

    expect(calculateStreak({ trades, noTradeDays: [], initialBalance: 1000 })).toBe(2);
  });
});
