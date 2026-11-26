import { useState } from 'react';
import { simulateRiskReturn, parseSimulationNumber } from '@asrv/backend';

const fields = [
  ['balance', 'Capital (USD)'], ['risk', 'Risco por operação (%)'],
  ['rr', 'Retorno por 1R (ex.: 2 ou 3)'], ['win', 'Taxa de acerto (%)'],
  ['operations', 'Quantidade de operações'],
] as const;

export function CalculatorTab({ balance }: { balance: number }) {
  const [values, setValues] = useState({ balance: String(Math.max(0, balance).toFixed(2)), risk: '5', rr: '2', win: '50', operations: '30' });
  const result = simulateRiskReturn(parseSimulationNumber(values.balance), parseSimulationNumber(values.risk), parseSimulationNumber(values.rr), parseSimulationNumber(values.win), parseSimulationNumber(values.operations));
  const usd = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'USD' });
  const pct = (value: number) => value.toFixed(2) + '%';
  const rows = result ? [
    ['Taxa de loss', pct(result.lossPct)],
    ['Wins / Losses simulados', result.wins + ' / ' + result.losses],
    ['Acerto após arredondamento', pct(result.realizedWinPct)],
    ['Stop loss inicial', usd(result.riskAmount)],
    ['Take profit inicial', usd(result.takeAmount)],
    ['Acerto mínimo teórico', pct(result.breakEvenPct)],
    ['Expectativa por operação', result.expectancyR.toFixed(2) + 'R'],
    ['Saldo final · risco fixo', usd(result.fixedBalance)],
    ['Lucro / perda · risco fixo', usd(result.fixedBalance - parseSimulationNumber(values.balance))],
    ['Saldo final · risco composto', usd(result.compoundedBalance)],
    ['Lucro / perda · risco composto', usd(result.compoundedBalance - parseSimulationNumber(values.balance))],
  ] : [];

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-white">Calculadora de Risco/Retorno</h2>
      <p className="text-sm text-slate-400">Simule seu gerenciamento sem alterar o diário.</p>
      <div className="asrv-card grid gap-4 sm:grid-cols-2">
        {fields.map(([key, label]) => (
          <label key={key} className="flex flex-col gap-1 text-sm text-slate-300">
            {label}
            <input className="asrv-field__input" inputMode="decimal" value={values[key]}
              onChange={(event) => setValues((previous) => ({ ...previous, [key]: event.target.value }))} />
          </label>
        ))}
      </div>
      {result ? <div className="asrv-card space-y-3" aria-live="polite">
        {rows.map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2 border-b border-slate-700/50 pb-2"><span className="text-sm text-slate-300">{label}</span><strong className="text-emerald-200">{value}</strong></div>)}
      </div> : <p role="alert" className="text-red-300">Preencha valores válidos: capital positivo, risco de 0 a 100% (maior que zero), RR de 0 a 100 (maior que zero), acerto de 0 a 100% e 1 a 1000 operações inteiras.</p>}
      <p className="text-xs text-slate-400">Simulação teórica sem custos ou breakevens. As vitórias são arredondadas para operações inteiras. Risco fixo usa o capital inicial e pode gerar saldo negativo teórico; composto recalcula o risco a cada operação. Não é previsão de lucro.</p>
    </section>
  );
}
