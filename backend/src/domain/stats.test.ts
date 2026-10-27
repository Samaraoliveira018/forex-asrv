import { describe, expect, it } from 'vitest';
import { createTrade, type Trade } from './trade';
import { calculateStats } from './stats';

let sequence = 0;

function trade(overrides: Partial<Parameters<typeof createTrade>[0]> = {}): Trade {
  sequence += 1;
  return createTrade({
    id: `stats-${sequence}`,
    date: '2026-10-01',
    asset: 'EURUSD',
    type: 'Compra',
    lots: 1,
    pnl: 0,
    ...overrides,
  });
}

describe('calculateStats', () => {
  it('zera tudo quando não há operações', () => {
    const stats = calculateStats({ trades: [], initialBalance: 1000, today: '2026-10-01' });

    expect(stats).toMatchObject({
      totalTrades: 0,
      wins: 0,
      losses: 0,
      breakEvens: 0,
      winRate: 0,
      totalPnl: 0,
      balance: 1000,
      returnPct: 0,
      profitFactor: 0,
      maxWin: 0,
      maxLoss: 0,
      buyCount: 0,
      sellCount: 0,
      todayCount: 0,
      todayCountedTrades: 0,
    });
  });

  it('separa vitórias, perdas e empates técnicos', () => {
    const stats = calculateStats({
      trades: [
        trade({ pnl: 100 }),
        trade({ pnl: 0.3, type: 'Venda' }),
        trade({ pnl: -0.3 }),
        trade({ pnl: -50, type: 'Venda' }),
      ],
      initialBalance: 1000,
      today: '2026-10-01',
    });

    expect(stats.totalTrades).toBe(4);
    expect(stats.wins).toBe(1);
    expect(stats.losses).toBe(1);
    expect(stats.breakEvens).toBe(2);
    expect(stats.winRate).toBe(25);
    expect(stats.buyCount).toBe(2);
    expect(stats.sellCount).toBe(2);
  });

  it('calcula patrimônio, retorno e fator de lucro', () => {
    const stats = calculateStats({
      trades: [
        trade({ pnl: 150 }),
        trade({ pnl: -50 }),
        trade({ pnl: 25 }),
      ],
      initialBalance: 1000,
      today: '2026-10-01',
    });

    expect(stats.totalPnl).toBe(125);
    expect(stats.balance).toBe(1125);
    expect(stats.returnPct).toBe(12.5);
    expect(stats.profitFactor).toBe(3.5);
    expect(stats.maxWin).toBe(150);
    expect(stats.maxLoss).toBe(-50);
  });

  it('retorna fator de lucro infinito quando só há lucro', () => {
    const stats = calculateStats({
      trades: [trade({ pnl: 10 })],
      initialBalance: 1000,
      today: '2026-10-01',
    });

    expect(stats.profitFactor).toBe(Number.POSITIVE_INFINITY);
  });

  it('conta apenas as operações do dia informado', () => {
    const stats = calculateStats({
      trades: [
        trade({ date: '2026-10-01' }),
        trade({ date: '2026-10-01' }),
        trade({ date: '2026-10-02' }),
      ],
      initialBalance: 1000,
      today: '2026-10-01',
    });

    expect(stats.todayCount).toBe(2);
  });

  it('não conta break even nas operações do dia que contam para o limite', () => {
    const stats = calculateStats({
      trades: [
        trade({ date: '2026-10-01', pnl: 10 }),
        trade({ date: '2026-10-01', pnl: -5 }),
        trade({ date: '2026-10-01', pnl: 0 }),
        trade({ date: '2026-10-01', pnl: 0.3 }),
        trade({ date: '2026-10-02', pnl: 10 }),
      ],
      initialBalance: 1000,
      today: '2026-10-01',
    });

    expect(stats.todayCount).toBe(4);
    expect(stats.todayCountedTrades).toBe(2);
    expect(stats.todayStops).toBe(1);
  });

  it('calcula resultado diário, semanal e mensal com % de perda', () => {
    const stats = calculateStats({
      trades: [
        trade({ date: '2026-09-30', pnl: 100 }),
        trade({ date: '2026-10-05', pnl: 50 }),
        trade({ date: '2026-10-19', pnl: -20 }),
        trade({ date: '2026-10-21', pnl: 10 }),
      ],
      initialBalance: 1000,
      today: '2026-10-21',
    });

    expect(stats.periods.daily.pnl).toBe(10);
    expect(stats.periods.daily.openingBalance).toBe(1130);
    expect(stats.periods.daily.pct).toBeCloseTo(0.885, 2);
    expect(stats.periods.daily.lossPct).toBe(0);
    expect(stats.periods.daily.trades).toBe(1);

    expect(stats.periods.weekly.pnl).toBe(-10);
    expect(stats.periods.weekly.openingBalance).toBe(1150);
    expect(stats.periods.weekly.pct).toBeCloseTo(-0.87, 2);
    expect(stats.periods.weekly.lossPct).toBeCloseTo(0.87, 2);
    expect(stats.periods.weekly.trades).toBe(2);
    expect(stats.periods.weekly.stops).toBe(1);

    expect(stats.periods.monthly.pnl).toBe(40);
    expect(stats.periods.monthly.openingBalance).toBe(1100);
    expect(stats.periods.monthly.pct).toBeCloseTo(3.636, 2);
    expect(stats.periods.monthly.lossPct).toBe(0);
    expect(stats.periods.monthly.trades).toBe(3);
    expect(stats.periods.monthly.stops).toBe(1);
  });

  it('não divide por zero quando o capital inicial é zero', () => {
    const stats = calculateStats({
      trades: [trade({ pnl: 10 })],
      initialBalance: 0,
      today: '2026-10-01',
    });

    expect(stats.returnPct).toBe(0);
    expect(stats.balance).toBe(10);
  });
});
