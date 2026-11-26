export function simulateRiskReturn(balance: number, riskPct: number, rr: number, winPct: number, operations: number) {
  if (![balance, riskPct, rr, winPct, operations].every(Number.isFinite)
    || balance <= 0 || riskPct <= 0 || riskPct > 100 || rr <= 0 || rr > 100
    || winPct < 0 || winPct > 100 || !Number.isInteger(operations) || operations < 1 || operations > 1000) return null;
  const risk = riskPct / 100;
  const wins = Math.round(operations * winPct / 100);
  const losses = operations - wins;
  const riskAmount = balance * risk;
  const takeAmount = riskAmount * rr;
  const fixedBalance = balance + wins * takeAmount - losses * riskAmount;
  const compoundedBalance = balance * (1 + risk * rr) ** wins * (1 - risk) ** losses;
  if (![riskAmount, takeAmount, fixedBalance, compoundedBalance].every(Number.isFinite)) return null;
  return {
    wins, losses, riskAmount, takeAmount, fixedBalance, compoundedBalance,
    lossPct: 100 - winPct,
    realizedWinPct: wins / operations * 100,
    breakEvenPct: 100 / (1 + rr),
    expectancyR: (winPct / 100) * rr - (1 - winPct / 100),
  };
}

export function parseSimulationNumber(value: string): number {
  const normalized = value.trim().replace(',', '.');
  return normalized === '' ? NaN : Number(normalized);
}
