import { describe, expect, it } from 'vitest';
import { evaluateDiscipline } from './discipline';
import { offensiveMilestones } from './dailyPlan';
import { createTrade, type TradeInput } from './trade';

function trade(overrides: Partial<TradeInput> = {}) {
  return createTrade({ date: '2026-10-23', asset: 'EURUSD', type: 'Compra', lots: 1, pnl: 10, ...overrides });
}

describe('ofensiva', () => {
  it('conta dias úteis distintos e deixa o fim de semana sem operação como descanso', () => {
    const result = evaluateDiscipline({ trades: [trade(), trade({ pnl: 0 })], noTradeDays: ['2026-10-22', '2026-10-22', '2026-10-24'], initialBalance: 100 });
    expect(result).toEqual({ streak: 2, violations: [] });
  });

  it('mantém a ofensiva zerada após o stop de perda, mesmo em outra sessão', () => {
    const result = evaluateDiscipline({ trades: [trade({ pnl: -12.5 }), trade({ pnl: -12.5 }), trade({ pnl: 0, session: 'night' }), trade(), trade()], noTradeDays: [], initialBalance: 100 });
    expect(result.streak).toBe(0);
    expect(result.violations.map(item => item.kind)).toEqual(['DAILY_TRADE_LIMIT', 'LOSS_OVER_LIMIT']);
  });

  it('conta operações do sábado e domingo na ofensiva', () => {
    const result = evaluateDiscipline({
      trades: [trade(), trade({ date: '2026-10-24' }), trade({ date: '2026-10-25' })],
      noTradeDays: ['2026-10-22', '2026-10-26'],
      initialBalance: 100,
    });
    expect(result).toEqual({ streak: 5, violations: [] });
  });

  it('soma perdas da data, incluindo taxas do break even, e zera no limite exato', () => {
    const input = { trades: [trade({ pnl: -24.9 }), trade({ pnl: -0.1 })], noTradeDays: [], initialBalance: 100 };
    expect(evaluateDiscipline({ ...input, initialBalance: 100.04 }).streak).toBe(1);
    const result = evaluateDiscipline(input);
    expect(result.streak).toBe(0);
    expect(result.violations[0]?.kind).toBe('LOSS_OVER_LIMIT');
  });

  it('continua mostrando metas de 30 em 30 depois de 150 dias', () => {
    expect(offensiveMilestones(0)).toEqual([30, 60, 90, 120, 150]);
    expect(offensiveMilestones(151)).toEqual([180, 210, 240, 270, 300]);
  });
});

it.each([
  [[1, -1.99, 0, 10, -2, 15], false], // 2 takes + 1 stop, diversos BE: para no segundo take.
  [[10, 0, 10], false],
  [[-2, 1.99, -2], false],
  [[10, -2, 10, -2], true], // Nova entrada após o segundo take.
  [[-2, 0, -2, 10], true],
  [[10, 10, -1, 1], false], // BE nunca conta nos limites de resultado.
] as const)('limites por resultado na sequência %j', (results, broken) => {
  const input = { trades: results.map(pnl => trade({ pnl })), noTradeDays: [], initialBalance: 1000 };
  const result = evaluateDiscipline(input);
  expect(result.violations.some(item => item.kind === 'DAILY_TRADE_LIMIT')).toBe(broken);
  expect(result.streak).toBe(broken ? 0 : 1);
});
