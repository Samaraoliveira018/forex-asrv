import { useState } from 'react';
import { simulateRiskReturn, parseSimulationNumber } from '@asrv/backend';

const fields = [
  ['balance', 'Capital (USD)'], ['risk', 'Risco por operação (%)'],
  ['rr', 'Risco/retorno (ex.: 4 para 1:4)'], ['win', 'Acertos esperados (%)'],
  ['operations', 'Quantidade de operações'],
] as const;

export function CalculatorTab({ balance }: { balance: number }) {
  const [values, setValues] = useState({ balance: String(Math.max(0, balance).toFixed(2)), risk: '5', rr: '2', win: '50', operations: '30' });
  const capital = parseSimulationNumber(values.balance);
  const risk = parseSimulationNumber(values.risk);
  const rr = parseSimulationNumber(values.rr);
  const count = parseSimulationNumber(values.operations);
  const result = simulateRiskReturn(capital, risk, rr, parseSimulationNumber(values.win), count);
  const usd = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'USD' });
  const pct = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%';
  const signed = (value: number) => (value > 0 ? '+' : value < 0 ? '−' : '') + usd(Math.abs(value));
  const scenarios = result ? [
    { title: 'Risco composto', description: 'O risco em dólares muda a cada operação: você mantém ' + pct(risk) + ' do saldo atualizado.', balance: result.compoundedBalance },
    { title: 'Risco fixo', description: 'Você arrisca sempre ' + usd(result.riskAmount) + ', mesmo quando o saldo muda.', balance: result.fixedBalance },
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
      {result ? <div className="space-y-4" aria-live="polite">
        <section className="asrv-card space-y-3">
          <h3 className="text-lg font-bold text-white">1. Quanto posso ganhar ou perder?</h3>
          <p className="text-sm text-slate-400">Primeira operação: RR 1:{rr}, risco de {pct(risk)} sobre {usd(capital)}.</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-700 p-3"><p className="text-sm text-slate-300">Se perder (Loss)</p><p className="mt-1 text-xl font-bold text-rose-300">{signed(-result.riskAmount)}</p></div>
            <div className="rounded-lg border border-slate-700 p-3"><p className="text-sm text-slate-300">Se ganhar (Win)</p><p className="mt-1 text-xl font-bold text-emerald-200">{signed(result.takeAmount)}</p></div>
          </div>
        </section>
        <section className="asrv-card space-y-3">
          <h3 className="text-lg font-bold text-white">2. Simulação de {count} operações</h3>
          <div className="flex justify-between gap-3">
            <div><p className="text-sm text-slate-300">Vitórias (Win)</p><p className="text-xl font-bold text-emerald-200">{result.wins} · {pct(result.realizedWinPct)}</p></div>
            <div className="text-right"><p className="text-sm text-slate-300">Derrotas (Loss)</p><p className="text-xl font-bold text-rose-300">{result.losses} · {pct(100 - result.realizedWinPct)}</p></div>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full" aria-hidden="true"><div className="bg-emerald-300" style={{ width: result.realizedWinPct + '%' }}/><div className="flex-1 bg-rose-300"/></div>
          <p className="text-sm text-slate-400">Com RR 1:{rr}, precisa acertar {pct(result.breakEvenPct)} para empatar no cálculo teórico de risco fixo, antes dos custos. Para lucrar, precisa superar essa taxa.</p>
        </section>
        <section className="asrv-card space-y-3">
          <h3 className="text-lg font-bold text-white">3. Quanto meu capital pode virar?</h3>
          <p className="text-sm text-slate-400">Capital de partida: {usd(capital)}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {scenarios.map((scenario) => {
              const profit = scenario.balance - capital;
              return <div key={scenario.title} className="rounded-lg border border-slate-700 p-4 space-y-2">
                <h4 className="font-semibold text-white">{scenario.title}</h4>
                <p className="text-sm text-slate-400">{scenario.description}</p>
                <p className="text-xs text-slate-400">Saldo final simulado</p>
                <p className={'text-2xl font-bold ' + (profit < 0 ? 'text-rose-300' : profit > 0 ? 'text-emerald-200' : 'text-slate-200')}>{usd(scenario.balance)}</p>
                <p className={'font-semibold ' + (profit < 0 ? 'text-rose-300' : profit > 0 ? 'text-emerald-200' : 'text-slate-300')}>{profit < 0 ? 'Prejuízo' : profit > 0 ? 'Lucro' : 'Resultado'}: {signed(profit)} ({pct(profit / capital * 100)})</p>
              </div>;
            })}
          </div>
        </section>
      </div> : <p role="alert" className="text-red-300">Preencha valores válidos: capital positivo, risco de 0 a 100% (maior que zero), RR de 0 a 100 (maior que zero), acerto de 0 a 100% e 1 a 1000 operações inteiras.</p>}
      <p className="text-xs text-slate-400">Simulação, não promessa de lucro. Considera apenas wins e losses completos, sem custos, slippage ou breakevens. As quantidades são arredondadas para operações inteiras. No risco fixo, o saldo teórico pode ficar negativo.</p>
    </section>
  );
}
