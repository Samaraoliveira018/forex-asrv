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

  it('detecta mais de duas operações e mistura de sessões', () => {
    const result = evaluateDiscipline({ trades: [trade({ pnl: -5 }), trade({ pnl: -5 }), trade({ pnl: 0, session: 'night' })], noTradeDays: [], initialBalance: 100 });
    expect(result.streak).toBe(0);
    expect(result.violations.map(item => item.kind)).toEqual(['DAILY_TRADE_LIMIT', 'MIXED_SESSIONS', 'LOSS_OVER_LIMIT']);
  });

  it('zera a ofensiva no domingo e conta apenas os dias úteis após a violação', () => {
    const result = evaluateDiscipline({ trades: [trade(), trade({ date: '2026-10-25' })], noTradeDays: ['2026-10-22', '2026-10-26'], initialBalance: 100 });
    expect(result.streak).toBe(1);
    expect(result.violations).toContainEqual(expect.objectContaining({ date: '2026-10-25', kind: 'WEEKEND_TRADE' }));
  });

  it('soma perdas da data, incluindo taxas do break even, e aceita o limite exato', () => {
    const input = { trades: [trade({ pnl: -9.9 }), trade({ pnl: -0.1 })], noTradeDays: [], initialBalance: 100 };
    expect(evaluateDiscipline(input).streak).toBe(1);
    const result = evaluateDiscipline({ ...input, initialBalance: 99.5 });
    expect(result.streak).toBe(0);
    expect(result.violations[0]?.kind).toBe('LOSS_OVER_LIMIT');
  });

  it('continua mostrando metas de 30 em 30 depois de 150 dias', () => {
    expect(offensiveMilestones(0)).toEqual([30, 60, 90, 120, 150]);
    expect(offensiveMilestones(151)).toEqual([180, 210, 240, 270, 300]);
  });
});
