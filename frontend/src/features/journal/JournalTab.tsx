import {
  MAX_STOPS_PER_SESSION,
  sessionLabel,
  type JournalSnapshot,
  type Trade,
  type TradeSession,
} from '@asrv/backend';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ProgressBar,
  SegmentedControl,
  StatCard,
  TradeCard,
} from '@asrv/design-system';
import { EquityChart } from './charts';
import { formatDate, isBreakEven, money, signedMoney, signedPercent, signedValue } from './format';

export type JournalView = 'grid' | 'list';
export type Market = 'nacional' | 'internacional';

const milestones = [3, 7, 14, 30, 60] as const;

/** Histórico sempre do mais recente para o mais antigo (empate: último registrado primeiro). */
function sortTradesByMostRecent(trades: readonly Trade[]): Trade[] {
  return trades
    .map((trade, index) => ({ trade, index }))
    .sort((a, b) => {
      const byDate = b.trade.date.localeCompare(a.trade.date);
      return byDate !== 0 ? byDate : b.index - a.index;
    })
    .map(({ trade }) => trade);
}

export function JournalTab({
  snapshot,
  hidden,
  market,
  view,
  onMarketChange,
  onViewChange,
  onToggleHidden,
  onNewTrade,
  onEditTrade,
  onDeleteTrade,
  onNoTradeDay,
  onDeleteNoTradeDay,
}: {
  snapshot: JournalSnapshot;
  hidden: boolean;
  market: Market;
  view: JournalView;
  onMarketChange: (market: Market) => void;
  onViewChange: (view: JournalView) => void;
  onToggleHidden: () => void;
  onNewTrade: () => void;
  onEditTrade: (trade: Trade) => void;
  onDeleteTrade: (trade: Trade) => void;
  onNoTradeDay: () => void;
  onDeleteNoTradeDay: (day: string) => void;
}) {
  const { stats, discipline } = snapshot;
  const nextMilestone = milestones.find((milestone) => discipline.streak < milestone) ?? 60;
  const sessionTone = (session: TradeSession) => {
    const counters = stats.todayBySession[session];
    if (counters.stops >= MAX_STOPS_PER_SESSION) {
      return 'danger' as const;
    }
    if (counters.stops === MAX_STOPS_PER_SESSION - 1) {
      return 'warning' as const;
    }
    return 'neutral' as const;
  };
  const periodTone = (pnl: number) => (pnl > 0 ? 'success' : pnl < 0 ? 'danger' : 'muted');
  const periodHint = (period: (typeof stats.periods)['daily']) =>
    `Resultado: ${signedPercent(period.pct)}\nPerda: ${period.lossPct.toFixed(2)}%`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SegmentedControl
          ariaLabel="Mercado"
          value={market}
          onChange={onMarketChange}
          options={[
            { value: 'nacional', label: 'Mercado Nacional' },
            { value: 'internacional', label: 'Mercado Internacional' },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral" pill>Operações hoje: {stats.todayCount} (inclui BE)</Badge>
          {(['day', 'night'] as const).map((session) => {
            const counters = stats.todayBySession[session];
            return (
              <span
                key={session}
                title={`Sessão ${sessionLabel(session)}: operações incluindo break even; máximo de ${MAX_STOPS_PER_SESSION} stops`}
              >
                <Badge tone={sessionTone(session)} pill>
                  <i
                    className={`fa-solid ${session === 'day' ? 'fa-sun' : 'fa-moon'} mr-1.5`}
                    aria-hidden="true"
                  />
                  {sessionLabel(session)}: {counters.totalTrades} operações ·{' '}
                  {counters.stops}/{MAX_STOPS_PER_SESSION} stops
                </Badge>
              </span>
            );
          })}

          <Button variant="success" size="sm" onClick={onNoTradeDay}>
            <i className="fa-solid fa-calendar-check" aria-hidden="true" />
            Registrar Dia Sem Operar
          </Button>

          <Button
            variant="ghost"
            size="sm"
            aria-label={hidden ? 'Mostrar valores' : 'Ocultar valores'}
            onClick={onToggleHidden}
          >
            <i className={`fa-solid ${hidden ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
          </Button>

          <Button className="ml-auto" onClick={onNewTrade}>
            <i className="fa-solid fa-plus text-xs" aria-hidden="true" />
            Nova operação
          </Button>
        </div>
      </div>

      <section className="asrv-streak space-y-3" aria-label="Metas de ofensiva">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-trophy text-amber-400" aria-hidden="true" />
            <h2 className="asrv-section-title">Metas de Ofensiva (Disciplina Trader)</h2>
          </div>
          <span className="text-xs font-semibold text-orange-400">
            Próxima meta: {nextMilestone} dias ({discipline.streak}/{nextMilestone})
          </span>
        </div>

        <ProgressBar
          label="Progresso da ofensiva"
          value={Math.min(discipline.streak, nextMilestone)}
          max={nextMilestone}
        />

        <div className="asrv-streak__milestones">
          {milestones.map((milestone, index) => (
            <div
              key={milestone}
              className={`asrv-milestone ${discipline.streak >= milestone ? 'is-reached' : ''}`}
            >
              <strong>{milestone} Dias</strong>
              <span>{['Iniciante', 'Focado', 'Blindado', 'Mestre', 'Lenda'][index]}</span>
            </div>
          ))}
        </div>
      </section>

      <div>
        <h1 className="asrv-page-title">Diário de Trading</h1>
        <p className="asrv-page-subtitle">
          Regras: Operações sem limite; máximo de {MAX_STOPS_PER_SESSION} stops por sessão
          (dia/noite; contador inclui break even) | Nenhuma perda individual &gt; 25% do saldo inicial do
          dia
        </p>
      </div>

      <section aria-label="Indicadores" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Patrimônio Total"
          value={money(stats.balance, hidden)}
          hint={`${stats.returnPct >= 0 ? '+' : ''}${stats.returnPct.toFixed(2)}% em relação ao inicial`}
          hintTone={stats.returnPct >= 0 ? 'success' : 'danger'}
        />
        <StatCard
          label="Resultado Acumulado"
          value={signedMoney(stats.totalPnl, hidden)}
          tone={stats.totalPnl > 0 ? 'success' : stats.totalPnl < 0 ? 'danger' : 'muted'}
        />
        <StatCard label="Win Rate" value={`${stats.winRate.toFixed(0)}%`} />
        <StatCard label="Operações Registradas" value={String(stats.totalTrades)} />
      </section>

      <section
        aria-label="Resultados por período"
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <StatCard
          label="Resultado Diário"
          value={signedMoney(stats.periods.daily.pnl, hidden)}
          tone={periodTone(stats.periods.daily.pnl)}
          hint={periodHint(stats.periods.daily)}
          hintTone={stats.periods.daily.pnl >= 0 ? 'success' : 'danger'}
          icon={<i className="fa-solid fa-sun" aria-hidden="true" />}
        />
        <StatCard
          label="Resultado Semanal"
          value={signedMoney(stats.periods.weekly.pnl, hidden)}
          tone={periodTone(stats.periods.weekly.pnl)}
          hint={periodHint(stats.periods.weekly)}
          hintTone={stats.periods.weekly.pnl >= 0 ? 'success' : 'danger'}
          icon={<i className="fa-solid fa-calendar-week" aria-hidden="true" />}
        />
        <StatCard
          label="Resultado Mensal"
          value={signedMoney(stats.periods.monthly.pnl, hidden)}
          tone={periodTone(stats.periods.monthly.pnl)}
          hint={periodHint(stats.periods.monthly)}
          hintTone={stats.periods.monthly.pnl >= 0 ? 'success' : 'danger'}
          icon={<i className="fa-solid fa-calendar" aria-hidden="true" />}
        />
      </section>

      <Card ariaLabel="Performance do patrimônio">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="asrv-section-title">
              <i className="fa-solid fa-chart-line mr-2 text-blue-500" aria-hidden="true" />
              Performance do Patrimônio
            </h2>
            <p className="asrv-page-subtitle">Evolução do saldo com base nas operações</p>
          </div>
          <div className="asrv-chart__stats">
            <span>
              Trades: <strong>{stats.totalTrades}</strong>
            </span>
            <span>
              Win Rate: <strong>{stats.winRate.toFixed(0)}%</strong>
            </span>
            <span>
              P/L: <strong className="asrv-positive">{signedMoney(stats.totalPnl, hidden)}</strong>
            </span>
          </div>
        </div>
        <EquityChart initialBalance={snapshot.initialBalance} trades={snapshot.trades} hidden={hidden} />
      </Card>

      <div className="space-y-4">
        <SegmentedControl
          ariaLabel="Formato do diário"
          value={view}
          onChange={onViewChange}
          options={[
            {
              value: 'grid',
              label: (
                <>
                  <i className="fa-solid fa-border-all" aria-hidden="true" /> Grid Visual
                </>
              ),
            },
            {
              value: 'list',
              label: (
                <>
                  <i className="fa-solid fa-list" aria-hidden="true" /> Lista
                </>
              ),
            },
          ]}
        />

        {view === 'grid' ? (
          <JournalGrid
            snapshot={snapshot}
            hidden={hidden}
            onEditTrade={onEditTrade}
            onDeleteTrade={onDeleteTrade}
            onDeleteNoTradeDay={onDeleteNoTradeDay}
          />
        ) : (
          <JournalList
            snapshot={snapshot}
            hidden={hidden}
            onEditTrade={onEditTrade}
            onDeleteTrade={onDeleteTrade}
          />
        )}
      </div>
    </div>
  );
}

function JournalGrid({
  snapshot,
  hidden,
  onEditTrade,
  onDeleteTrade,
  onDeleteNoTradeDay,
}: {
  snapshot: JournalSnapshot;
  hidden: boolean;
  onEditTrade: (trade: Trade) => void;
  onDeleteTrade: (trade: Trade) => void;
  onDeleteNoTradeDay: (day: string) => void;
}) {
  const items = [
    ...snapshot.trades.map((trade) => ({ kind: 'trade' as const, date: trade.date, trade })),
    ...snapshot.noTradeDays.map((day) => ({ kind: 'no-trade' as const, date: day, day })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  if (items.length === 0) {
    return <EmptyState>Nenhuma operação ou dia de disciplina registrado ainda.</EmptyState>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) =>
        item.kind === 'no-trade' ? (
          <article key={`nt-${item.day}`} className="asrv-trade-card asrv-trade-card--discipline">
            <div className="asrv-trade-card__header">
              <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-400">
                <i className="fa-solid fa-shield-halved" aria-hidden="true" /> Preservação de Capital
              </span>
              <span className="asrv-trade-card__date">{formatDate(item.day)}</span>
            </div>
            <div className="asrv-trade-card__body">
              <p className="text-xs italic text-slate-400">
                &quot;Mercado sem padrão claro. Decisão consciente de não operar e proteger o
                capital.&quot;
              </p>
              <p className="mt-2 text-xs font-bold text-emerald-400">+1 dia de Ofensiva 🔥</p>
            </div>
            <div className="asrv-trade-card__footer">
              <button
                type="button"
                className="asrv-trade-card__action asrv-trade-card__action--danger"
                onClick={() => onDeleteNoTradeDay(item.day)}
              >
                <i className="fa-solid fa-trash" aria-hidden="true" /> Eliminar
              </button>
            </div>
          </article>
        ) : (
          <TradeCard
            key={item.trade.id}
            asset={item.trade.asset}
            date={item.trade.date}
            type={item.trade.type}
            session={item.trade.session}
            lots={item.trade.lots}
            pnl={item.trade.pnl}
            notes={item.trade.notes}
            screenshotUrl={snapshot.screenshotUrls[item.trade.id]}
            hidden={hidden}
            onEdit={() => onEditTrade(item.trade)}
            onDelete={() => onDeleteTrade(item.trade)}
            editLabel={`Editar ${item.trade.asset} de ${formatDate(item.trade.date)}`}
            deleteLabel={`Excluir ${item.trade.asset} de ${formatDate(item.trade.date)}`}
          />
        ),
      )}
    </div>
  );
}

function JournalList({
  snapshot,
  hidden,
  onEditTrade,
  onDeleteTrade,
}: {
  snapshot: JournalSnapshot;
  hidden: boolean;
  onEditTrade: (trade: Trade) => void;
  onDeleteTrade: (trade: Trade) => void;
}) {
  const orderedTrades = sortTradesByMostRecent(snapshot.trades);

  if (orderedTrades.length === 0) {
    return <EmptyState>Nenhum registro encontrado.</EmptyState>;
  }

  return (
    <Card flush>
      <div className="overflow-x-auto">
        <table className="asrv-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Data</th>
              <th>Ativo</th>
              <th>Tipo</th>
              <th>Sessão</th>
              <th>Lotes</th>
              <th>Resultado</th>
              <th>Status</th>
              <th className="text-center">Print</th>
              <th className="text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            {orderedTrades.map((trade, index) => {
              const breakEven = isBreakEven(trade.pnl);
              return (
                <tr key={trade.id}>
                  <td className="text-slate-500">{index + 1}</td>
                  <td className="font-medium">{trade.date}</td>
                  <td className="font-bold text-white">{trade.asset}</td>
                  <td>
                    <Badge tone={trade.type === 'Compra' ? 'success' : 'danger'}>
                      {trade.type}
                    </Badge>
                  </td>
                  <td>
                    <Badge tone={trade.session === 'night' ? 'orange' : 'info'}>
                      {sessionLabel(trade.session)}
                    </Badge>
                  </td>
                  <td>{trade.lots}</td>
                  <td
                    className={
                      breakEven
                        ? 'font-bold text-slate-300'
                        : trade.pnl > 0
                          ? 'font-bold text-emerald-400'
                          : 'font-bold text-red-400'
                    }
                  >
                    {hidden ? '••••••' : signedValue(trade.pnl)}
                  </td>
                  <td>
                    <Badge
                      tone={breakEven ? 'neutral' : trade.pnl > 0 ? 'success' : 'danger'}
                    >
                      {breakEven ? 'BREAK EVEN' : trade.pnl > 0 ? 'WIN' : 'LOSS'}
                    </Badge>
                  </td>
                  <td className="text-center">
                    {!hidden && snapshot.screenshotUrls[trade.id] ? (
                      <a
                        className="asrv-trade-card__action"
                        href={snapshot.screenshotUrls[trade.id]}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Ver print de ${trade.asset} de ${formatDate(trade.date)}`}
                      >
                        <i className="fa-solid fa-image" aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="asrv-trade-card__action mr-2"
                      aria-label={`Editar ${trade.asset} de ${formatDate(trade.date)}`}
                      onClick={() => onEditTrade(trade)}
                    >
                      <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="asrv-trade-card__action asrv-trade-card__action--danger"
                      aria-label={`Excluir ${trade.asset} de ${formatDate(trade.date)}`}
                      onClick={() => onDeleteTrade(trade)}
                    >
                      <i className="fa-solid fa-trash" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
