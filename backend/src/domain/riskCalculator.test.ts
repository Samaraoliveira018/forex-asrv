import { describe, expect, it } from 'vitest';
import { simulateRiskReturn, parseSimulationNumber } from './riskCalculator';

describe('risk calculator', () => {
  it('projects fixed and compounded risk at 50% accuracy', () => {
    const result = simulateRiskReturn(86.59, 5, 2, 50, 30)!;
    expect(result.wins).toBe(15);
    expect(result.losses).toBe(15);
    expect(result.riskAmount).toBeCloseTo(4.3295);
    expect(result.fixedBalance).toBeCloseTo(151.5325);
    expect(result.compoundedBalance).toBeCloseTo(86.59 * 1.1 ** 15 * 0.95 ** 15);
    expect(result.breakEvenPct).toBeCloseTo(100 / 3);
    expect(result.expectancyR).toBeCloseTo(0.5);
  });
  it('supports 1:3 and rounds the number of wins', () => {
    const result = simulateRiskReturn(100, 5, 3, 50, 3)!;
    expect(result.wins).toBe(2);
    expect(result.losses).toBe(1);
    expect(result.realizedWinPct).toBeCloseTo(200 / 3);
    expect(result.breakEvenPct).toBe(25);
  });
  it('handles all losses and all wins', () => {
    expect(simulateRiskReturn(100, 100, 2, 0, 3)?.compoundedBalance).toBe(0);
    expect(simulateRiskReturn(100, 5, 2, 100, 2)?.compoundedBalance).toBeCloseTo(121);
  });
  it('rejects invalid inputs and accepts decimal commas', () => {
    expect(parseSimulationNumber('86,59')).toBe(86.59);
    expect(parseSimulationNumber('')).toBeNaN();
    expect(simulateRiskReturn(100, 5, 2, 101, 30)).toBeNull();
    expect(simulateRiskReturn(100, 5, 2, 50, 1.5)).toBeNull();
    expect(simulateRiskReturn(100, 0, 2, 50, 30)).toBeNull();
  });
});
