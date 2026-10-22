import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { JournalSnapshot, TradeType } from '@asrv/backend';
import { Badge, Button, Card, StatCard } from '@asrv/design-system';
import { useBff } from '../../BffContext';

type FormState = {
  date: string;
  asset: string;
  type: TradeType;
  lots: string;
  pnl: string;
  notes: string;
};

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' });

export function JournalScreen({ onSignedOut }: { onSignedOut: () => void }) {
  const bff = useBff();
  const [snapshot, setSnapshot] = useState<JournalSnapshot | null>(null);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>(() => ({
    date: today(),
    asset: '',
    type: 'Compra',
    lots: '1',
    pnl: '',
    notes: '',
  }));

  const load = useCallback(async () => {
    try {
      setSnapshot(await bff.journal.list());
    } catch (cause) {
      setError(messageOf(cause));
    }
  }, [bff]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setWarnings([]);

    if (!form.asset.trim() || !form.lots.trim() || !form.pnl.trim()) {
      setError('Preencha ativo, lotes e resultado.');
      return;
    }

    try {
      const result = await bff.journal.saveTrade({
        date: form.date,
        asset: form.asset,
        type: form.type,
        lots: numberFrom(form.lots),
        pnl: numberFrom(form.pnl),
        notes: form.notes,
      });

      const messages = [...result.warnings];
      if (!result.synced) {
        messages.push('Salvo no dispositivo; será enviado ao reconectar.');
      }
      setWarnings(messages);
      setForm((current) => ({ ...current, asset: '', pnl: '', notes: '' }));
      await load();
    } catch (cause) {
      setError(messageOf(cause));
    }
  }

  async function handleDelete(id: string) {
    setError('');
    try {
      await bff.journal.deleteTrade(id);
      await load();
    } catch (cause) {
      setError(messageOf(cause));
    }
  }

  async function handleNoTradeDay() {
    setError('');
    try {
      await bff.journal.registerNoTradeDay(today());
      await load();
    } catch (cause) {
      setError(messageOf(cause));
    }
  }

  async function handleSignOut() {
    try {
      await bff.auth.signOut();
    } finally {
      onSignedOut();
    }
  }

  if (!snapshot) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <p role="status">Carregando diário…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400">
              Diário Trader
            </p>
            <h1 className="text-2xl font-bold">ASRV</h1>
          </div>
          <div className="flex items-center gap-2">
            {snapshot.discipline.streak > 0 ? (
              <Badge tone="success">Ofensiva de {snapshot.discipline.streak} dias</Badge>
            ) : null}
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              Sair
            </Button>
          </div>
        </header>

        {error ? (
          <p role="alert" className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        {warnings.length > 0 ? (
          <div role="status" className="rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}

        <section aria-label="Resumo" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Banca" value={money.format(snapshot.stats.balance)} />
          <StatCard label="Resultado" value={formatSigned(snapshot.stats.totalPnl)} />
          <StatCard label="Operações" value={String(snapshot.stats.totalTrades)} />
          <StatCard label="Ofensiva" value={`${snapshot.discipline.streak} dias`} />
        </section>

        <Card ariaLabel="Nova operação">
          <h2 className="text-lg font-semibold">Nova operação</h2>
          <form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={handleSubmit} noValidate>
            <Field label="Data" htmlFor="date">
              <input
                id="date"
                type="date"
                value={form.date}
                onChange={(event) => setForm({ ...form, date: event.target.value })}
                className={inputClass}
              />
            </Field>

            <Field label="Ativo" htmlFor="asset">
              <input
                id="asset"
                value={form.asset}
                onChange={(event) => setForm({ ...form, asset: event.target.value })}
                placeholder="EURUSD"
                className={inputClass}
              />
            </Field>

            <Field label="Tipo" htmlFor="type">
              <select
                id="type"
                value={form.type}
                onChange={(event) =>
                  setForm({ ...form, type: event.target.value as TradeType })
                }
                className={inputClass}
              >
                <option value="Compra">Compra</option>
                <option value="Venda">Venda</option>
              </select>
            </Field>

            <Field label="Lotes" htmlFor="lots">
              <input
                id="lots"
                type="number"
                min="0"
                step="0.01"
                value={form.lots}
                onChange={(event) => setForm({ ...form, lots: event.target.value })}
                className={inputClass}
              />
            </Field>

            <Field label="Resultado (US$)" htmlFor="pnl">
              <input
                id="pnl"
                type="number"
                step="0.01"
                value={form.pnl}
                onChange={(event) => setForm({ ...form, pnl: event.target.value })}
                placeholder="-25.00"
                className={inputClass}
              />
            </Field>

            <Field label="Observações" htmlFor="notes">
              <input
                id="notes"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                placeholder="Opcional"
                className={inputClass}
              />
            </Field>

            <div className="sm:col-span-2 lg:col-span-3">
              <Button type="submit">Registrar</Button>
            </div>
          </form>
        </Card>

        <Card ariaLabel="Histórico">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Histórico</h2>
            <Button variant="secondary" size="sm" onClick={handleNoTradeDay}>
              Hoje sem operar
            </Button>
          </div>

          {snapshot.trades.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">Nenhuma operação registrada ainda.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-800">
              {[...snapshot.trades].reverse().map((trade) => (
                <li key={trade.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{trade.asset}</p>
                    <p className="text-sm text-slate-400">
                      {formatDate(trade.date)} · {trade.type} · {trade.lots} lote(s)
                    </p>
                    {trade.notes ? (
                      <p className="mt-1 truncate text-sm text-slate-500">{trade.notes}</p>
                    ) : null}
                  </div>

                  <span
                    className={
                      trade.pnl > 0
                        ? 'font-semibold text-emerald-400'
                        : trade.pnl < 0
                          ? 'font-semibold text-red-400'
                          : 'font-semibold text-slate-300'
                    }
                  >
                    {formatSigned(trade.pnl)}
                  </span>

                  <Button
                    variant="danger"
                    size="sm"
                    aria-label={`Excluir ${trade.asset} de ${formatDate(trade.date)}`}
                    onClick={() => handleDelete(trade.id)}
                  >
                    Excluir
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </main>
  );
}

const inputClass =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-emerald-500';

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}

function today(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function numberFrom(value: string): number {
  return Number(value.replace(',', '.'));
}

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return year && month && day ? `${day}/${month}/${year}` : isoDate;
}

function formatSigned(value: number): string {
  const formatted = money.format(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Algo deu errado. Tente novamente.';
}
