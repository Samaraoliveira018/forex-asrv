import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import type { JournalSnapshot, Trade, TradeInput } from '@asrv/backend';
import {
  Alert,
  Button,
  NavItem,
} from '@asrv/design-system';
import { useBff } from '../../BffContext';
import { DashboardTab } from './DashboardTab';
import { JournalTab, type JournalView, type Market } from './JournalTab';
import { PlanTab } from './PlanTab';
import { StatsTab } from './StatsTab';
import { TradeModal } from './TradeModal';
import { formatDate, money, parseDateInput, today } from './format';

type Tab = 'dashboard' | 'journal' | 'plan' | 'stats';

const navItems: ReadonlyArray<{ id: Tab; label: string; icon: string }> = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fa-table-cells-large' },
  { id: 'journal', label: 'Diário de Trading', icon: 'fa-book-open' },
  { id: 'plan', label: 'Plano Operacional', icon: 'fa-clipboard-list' },
  { id: 'stats', label: 'Dados Estatísticos', icon: 'fa-chart-pie' },
];

export function JournalScreen({ onSignedOut }: { onSignedOut: () => void }) {
  const bff = useBff();
  const fileInput = useRef<HTMLInputElement>(null);
  const [snapshot, setSnapshot] = useState<JournalSnapshot | null>(null);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>('journal');
  const [market, setMarket] = useState<Market>('internacional');
  const [view, setView] = useState<JournalView>('grid');
  const [hidden, setHidden] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Trade | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [balanceDraft, setBalanceDraft] = useState('150');
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [checklist, setChecklist] = useState<boolean[]>(() => [false, false, false, false, false]);

  const load = useCallback(async () => {
    const next = await bff.journal.list();
    setSnapshot(next);
    setBalanceDraft(String(next.initialBalance));
    return next;
  }, [bff]);

  useEffect(() => {
    let active = true;
    bff.journal
      .list()
      .then((next) => {
        if (!active) return;
        setSnapshot(next);
        setBalanceDraft(String(next.initialBalance));
      })
      .catch((cause) => {
        if (active) setError(messageOf(cause));
      });

    return () => {
      active = false;
    };
  }, [bff]);

  useEffect(() => {
    bff.journal
      .pendingCount()
      .then(setPending)
      .catch(() => setPending(0));
  }, [bff, snapshot]);

  async function handleSaveTrade(input: TradeInput, screenshotDataUrl?: string | null) {
    setError('');
    setWarnings([]);
    const result = await bff.journal.saveTrade(input, screenshotDataUrl);
    const messages = [...result.warnings];
    if (!result.synced) {
      messages.push('Salvo no dispositivo; será enviado ao reconectar.');
    }
    setWarnings(messages);
    await load();
  }

  async function handleDeleteTrade(trade: Trade) {
    if (!window.confirm(`Tem a certeza de que deseja eliminar ${trade.asset}?`)) return;
    setError('');
    try {
      await bff.journal.deleteTrade(trade.id);
      await load();
    } catch (cause) {
      setError(messageOf(cause));
    }
  }

  async function handleNoTradeDay() {
    const input = window.prompt(
      'Digite a data em que você não operou (dd/mm/aa):',
      formatDate(today()),
    );
    if (!input) return;

    const target = parseDateInput(input);
    if (!target) {
      setError('Formato de data inválido. Use dd/mm/aa.');
      return;
    }

    setError('');
    try {
      await bff.journal.registerNoTradeDay(target);
      await load();
    } catch (cause) {
      setError(messageOf(cause));
    }
  }

  async function handleDeleteNoTradeDay(day: string) {
    if (!window.confirm(`Remover o registro de 'Não Operei' da data ${day}?`)) return;
    setError('');
    try {
      await bff.journal.removeNoTradeDay(day);
      await load();
    } catch (cause) {
      setError(messageOf(cause));
    }
  }

  async function handleInitialBalance() {
    const value = Number(balanceDraft.replace(',', '.'));
    if (!Number.isFinite(value) || value < 0) {
      setError('O saldo inicial deve ser maior ou igual a zero.');
      setBalanceDraft(String(snapshot?.initialBalance ?? 0));
      return;
    }

    if (value === snapshot?.initialBalance) return;

    setError('');
    try {
      await bff.journal.saveInitialBalance(value);
      await load();
    } catch (cause) {
      setError(messageOf(cause));
    }
  }

  function handleBalanceKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
    }
  }

  async function handleSignOut() {
    try {
      await bff.auth.signOut();
    } finally {
      onSignedOut();
    }
  }

  async function handleSync() {
    setSyncing(true);
    setError('');
    try {
      await bff.journal.flush();
      setPending(await bff.journal.pendingCount());
      await load();
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setSyncing(false);
    }
  }

  function handleExport() {
    if (!snapshot) return;
    const payload = JSON.stringify(
      {
        trades: snapshot.trades,
        noTradeDays: snapshot.noTradeDays,
        initialBalance: snapshot.initialBalance,
      },
      null,
      2,
    );
    const anchor = document.createElement('a');
    anchor.href = `data:text/json;charset=utf-8,${encodeURIComponent(payload)}`;
    anchor.download = `diario_trader_asrv_backup_${today()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');
    try {
      const parsed = JSON.parse(await file.text()) as {
        trades?: Trade[];
        noTradeDays?: string[];
        initialBalance?: number;
      };

      if (!Array.isArray(parsed.trades)) {
        throw new Error('Ficheiro inválido.');
      }

      for (const trade of parsed.trades) {
        await bff.journal.saveTrade(trade);
      }
      for (const day of parsed.noTradeDays ?? []) {
        try {
          await bff.journal.registerNoTradeDay(day);
        } catch {
          // Dia já existente ou com operação: a importação continua.
        }
      }
      if (Number.isFinite(parsed.initialBalance)) {
        await bff.journal.saveInitialBalance(Number(parsed.initialBalance));
      }
      await load();
      setWarnings(['Dados importados com sucesso.']);
    } catch (cause) {
      setError(messageOf(cause));
    }
  }

  async function handleReset() {
    if (!window.confirm('Tem a certeza de que deseja resetar todo o histórico e a sua ofensiva?')) {
      return;
    }
    if (!snapshot) return;

    setError('');
    try {
      for (const trade of snapshot.trades) {
        await bff.journal.deleteTrade(trade.id);
      }
      for (const day of snapshot.noTradeDays) {
        await bff.journal.removeNoTradeDay(day);
      }
      await load();
    } catch (cause) {
      setError(messageOf(cause));
    }
  }

  function openNewTrade() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEditTrade(trade: Trade) {
    setEditing(trade);
    setModalOpen(true);
  }

  function navigate(next: Tab) {
    setTab(next);
    setSidebarOpen(false);
  }

  if (!snapshot) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b0f19] text-slate-400">
        <p role="status">Carregando diário…</p>
      </main>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0b0f19] text-slate-200">
      <button
        type="button"
        className="asrv-icon-button asrv-mobile-only fixed left-4 top-4 z-50"
        aria-label="Abrir menu"
        onClick={() => setSidebarOpen((current) => !current)}
      >
        <i className="fa-solid fa-bars" aria-hidden="true" />
      </button>

      <aside
        className={`asrv-sidebar z-40 flex-col justify-between ${
          sidebarOpen ? 'flex' : 'hidden md:flex'
        }`}
      >
        <div>
          <div className="border-b border-[#1f2937] p-5">
            <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-white">
              <span className="asrv-brand-mark">DT</span>
              Diário Trader ASRV
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Gestão de risco e diário com disciplina
            </p>
          </div>

          <nav className="space-y-1 p-3" aria-label="Navegação principal">
            {navItems.map((item) => (
              <NavItem
                key={item.id}
                active={tab === item.id}
                icon={<i className={`fa-solid ${item.icon}`} aria-hidden="true" />}
                onClick={() => navigate(item.id)}
              >
                {item.label}
              </NavItem>
            ))}
          </nav>
        </div>

        <div className="space-y-2 border-t border-[#1f2937] p-3">
          <div className="rounded border border-gray-800 bg-gray-900/80 px-2 py-1">
            <p className="text-[10px] font-semibold uppercase text-gray-400">Armazenamento</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs font-medium">
              <span
                className={`h-1.5 w-1.5 animate-pulse rounded-full ${
                  pending > 0 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
              />
              <span className={pending > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                {pending > 0 ? 'Pendências para enviar' : 'Salvo Automaticamente'}
              </span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <Button variant="secondary" size="sm" loading={syncing} onClick={handleSync}>
              <i className="fa-solid fa-rotate text-[10px]" aria-hidden="true" /> Sincronizar
            </Button>
            <Button variant="secondary" size="sm" onClick={handleSignOut}>
              <i className="fa-solid fa-right-from-bracket text-[10px]" aria-hidden="true" /> Sair
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <Button variant="secondary" size="sm" onClick={handleExport}>
              <i className="fa-solid fa-download text-[10px]" aria-hidden="true" /> Exportar
            </Button>
            <Button variant="secondary" size="sm" onClick={() => fileInput.current?.click()}>
              <i className="fa-solid fa-upload text-[10px]" aria-hidden="true" /> Importar
            </Button>
          </div>

          <button
            type="button"
            className="w-full py-1 text-center text-[11px] text-red-400 hover:text-red-300 hover:underline"
            onClick={handleReset}
          >
            Resetar Todos os Dados
          </button>
        </div>
      </aside>

      <div className="flex h-screen flex-1 flex-col overflow-hidden">
        <header className="asrv-topbar flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3 pl-10 md:pl-0">
            <span className="hidden whitespace-nowrap text-sm font-semibold tracking-wide text-white lg:inline">
              Diário Trader ASRV
            </span>
            <span
              className="asrv-topbar__streak"
              title="Dias seguidos de disciplina"
            >
              <i className="fa-solid fa-fire animate-bounce text-orange-500" aria-hidden="true" />
              <span>{snapshot.discipline.streak}</span>
              <span className="hidden text-[11px] font-medium text-orange-300 lg:inline">
                dias de disciplina
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="asrv-topbar__balance">
              <span className="text-xs text-gray-400">Saldo Inicial:</span>
              <span className="text-xs font-bold text-emerald-400">$ / R$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                aria-label="Saldo Inicial"
                value={balanceDraft}
                onChange={(event) => setBalanceDraft(event.target.value)}
                onBlur={handleInitialBalance}
                onKeyDown={handleBalanceKeyDown}
                className="w-20 border-0 bg-transparent text-xs font-bold text-white outline-none"
              />
            </div>

            <div className="flex items-center gap-2 border-l border-gray-800 pl-3">
              <div className="asrv-avatar">
                <i className="fa-solid fa-user" aria-hidden="true" />
              </div>
            </div>
          </div>
        </header>

        <main className="asrv-main asrv-scrollbar flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-[1600px] space-y-6">
            {error ? <Alert tone="danger">{error}</Alert> : null}
            {warnings.length > 0 ? (
              <Alert tone="warning" role="status">
                {warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </Alert>
            ) : null}

            {tab === 'journal' ? (
              <JournalTab
                snapshot={snapshot}
                hidden={hidden}
                market={market}
                view={view}
                onMarketChange={setMarket}
                onViewChange={setView}
                onToggleHidden={() => setHidden((current) => !current)}
                onNewTrade={openNewTrade}
                onEditTrade={openEditTrade}
                onDeleteTrade={handleDeleteTrade}
                onNoTradeDay={handleNoTradeDay}
                onDeleteNoTradeDay={handleDeleteNoTradeDay}
              />
            ) : null}

            {tab === 'dashboard' ? <DashboardTab snapshot={snapshot} hidden={hidden} /> : null}

            {tab === 'plan' ? (
              <PlanTab
                checklist={checklist}
                onToggle={(index, checked) =>
                  setChecklist((current) =>
                    current.map((value, position) => (position === index ? checked : value)),
                  )
                }
              />
            ) : null}

            {tab === 'stats' ? <StatsTab snapshot={snapshot} /> : null}

            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#1f2937] pt-4 text-[11px] text-slate-500">
              <span>Diário Trader ASRV · disciplina e gestão de risco</span>
              <span>
                Patrimônio:{' '}
                <strong className="text-slate-300">
                  {money(snapshot.stats.balance, hidden)}
                </strong>
              </span>
            </footer>
          </div>
        </main>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept=".json"
        className="hidden"
        aria-label="Importar dados"
        onChange={handleImport}
      />

      <TradeModal
        open={modalOpen}
        trade={editing}
        screenshotUrl={editing ? snapshot?.screenshotUrls[editing.id] : undefined}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSaveTrade}
      />
    </div>
  );
}

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Algo deu errado. Tente novamente.';
}
