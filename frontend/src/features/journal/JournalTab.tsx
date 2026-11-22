import { useEffect, useState } from 'react';
import { DailyHome } from './DailyHome';
import { formatRiskReward,
  historyRange,
  isBreakEven,
  isWeekend,
  type HistoryPeriod,
  sessionLabel,
  type JournalSnapshot,
  type Trade,
  type UsdBrlQuote,
  watchUsdBrlQuote,
} from '@asrv/backend';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  SegmentedControl,
  StatCard,
  TradeCard,
} from '@asrv/design-system';
import { formatDate, money, signedMoney, signedPercent, signedValue, today } from './format';

export type JournalView = 'grid' | 'list';
export type Market = 'nacional' | 'internacional';


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
  mode = 'history',
  onOpenHistory = () => {},
  onOpenPlan = () => {},
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
  mode?: 'home' | 'history';
  onOpenHistory?: () => void;
  onOpenPlan?: () => void;
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
  const [quoteAttempt, setQuoteAttempt] = useState(0);
  const [quote, setQuote] = useState<UsdBrlQuote>();
  const [quoteUnavailable, setQuoteUnavailable] = useState<boolean>();
  useEffect(() => watchUsdBrlQuote(next => {
    if (next) setQuote(next);
    setQuoteUnavailable(next === null);
  }, typeof localStorage !== 'undefined' ? localStorage : undefined), [quoteAttempt]);

  const [selectedDate, setSelectedDate] = useState('');
  const [historyPeriod, setHistoryPeriod] = useState<HistoryPeriod>('day');
  const [resultFilter, setResultFilter] = useState('all');
  const range = selectedDate ? historyRange(selectedDate, historyPeriod) : null;
  const inRange = (date: string) => !range || (date >= range.start && date <= range.end);
  const datedTrades = snapshot.trades.filter(t => inRange(t.date));
  const historyLabel = !range ? 'Todos os dias' : historyPeriod === 'day'
    ? `Diário de ${formatDate(selectedDate)}`
    : `${historyPeriod === 'week' ? 'Semana' : 'Mês'} de ${formatDate(range.start)} a ${formatDate(range.end)}`;
  function changeHistoryPeriod(period: HistoryPeriod) {
    setHistoryPeriod(period);
    if (!selectedDate) setSelectedDate(today());
  }
  const filteredSnapshot = {
    ...snapshot,
    trades: datedTrades.filter(t => resultFilter === 'all' || (resultFilter === 'be' ? isBreakEven(t.pnl) : resultFilter === 'win' ? t.pnl > 0 && !isBreakEven(t.pnl) : t.pnl < 0 && !isBreakEven(t.pnl))),
    noTradeDays: snapshot.noTradeDays.filter(d => resultFilter === 'all' && inRange(d)),
  };
  const historyMoney = (value: number) => hidden ? '••••••' : `${value < 0 ? '- ' : value > 0 ? '+ ' : ''}$ ${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const gains = datedTrades.reduce((sum, t) => sum + Math.max(0, t.pnl), 0);
  const losses = datedTrades.reduce((sum, t) => sum + Math.min(0, t.pnl), 0);
  const periodTone = (pnl: number) => (pnl > 0 ? 'success' : pnl < 0 ? 'danger' : 'muted');

  if (mode === 'home') return <DailyHome snapshot={snapshot} hidden={hidden}
    quote={quote ?? (quoteUnavailable ? null : undefined)} quoteUnavailable={quoteUnavailable}
    onRefreshQuote={() => setQuoteAttempt(value => value + 1)} onToggleHidden={onToggleHidden}
    onNewTrade={onNewTrade} onOpenHistory={onOpenHistory} onOpenPlan={onOpenPlan}
    onNoTradeDay={onNoTradeDay} onEditTrade={onEditTrade} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3"><h1 className="asrv-page-title">Histórico</h1>
        <div className="flex flex-wrap gap-2"><Button variant="ghost" onClick={onToggleHidden}>{hidden ? 'Mostrar valores' : 'Ocultar valores'}</Button><Button onClick={onNewTrade}>Nova operação</Button><Button variant="secondary" onClick={onNoTradeDay}>Dia sem operar</Button></div></div>
      <Card ariaLabel="Consultar diário por data">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <h2 className="asrv-section-title">Histórico do diário</h2>
            <p className="asrv-page-subtitle">Escolha uma data e consulte as operações do dia, da semana ou do mês.</p>
          </div>
          <label className="flex flex-col gap-1 text-sm text-slate-300">Data do diário
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-white" style={{ colorScheme: 'dark' }} />
          </label>
          <Button onClick={() => { setHistoryPeriod('day'); setSelectedDate(today()); }}>Hoje</Button>
          <Button onClick={() => { setSelectedDate(''); setHistoryPeriod('day'); }}>Todos os dias</Button>
        </div>
        <SegmentedControl ariaLabel="Período do histórico" value={historyPeriod} onChange={changeHistoryPeriod} options={[
          { value: 'day', label: 'Dia' }, { value: 'week', label: 'Semana' }, { value: 'month', label: 'Mês' },
        ]} />
        <p className="my-3 text-sm text-slate-400" aria-live="polite">
          {historyLabel}
          {historyPeriod === 'day' && selectedDate && snapshot.noTradeDays.includes(selectedDate) ? ' · Dia registrado sem operar' : ''}
          {` · ${datedTrades.filter(t => t.pnl > 0 && !isBreakEven(t.pnl)).length} ganhos · ${datedTrades.filter(t => t.pnl < 0 && !isBreakEven(t.pnl)).length} perdas · ${datedTrades.filter(t => isBreakEven(t.pnl)).length} BE`}
        </p>
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumo do histórico">
          <StatCard label="Ganhos brutos" value={historyMoney(gains)} tone="success" />
          <StatCard label="Perdas brutas" value={historyMoney(losses)} tone="danger" />
          <StatCard label={range && historyPeriod === 'week' ? 'Resultado semanal' : range && historyPeriod === 'month' ? 'Resultado mensal' : 'Resultado líquido'} value={historyMoney(gains + losses)} tone={periodTone(gains + losses)} />
          <StatCard label="Operações (inclui BE)" value={String(datedTrades.length)} />
        </div>
        <label className="flex flex-wrap items-center gap-3 text-sm text-slate-300">Mostrar operações
          <select value={resultFilter} onChange={e => setResultFilter(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-white">
            <option value="all">Todos os resultados</option><option value="win">Ganhos</option><option value="loss">Perdas</option><option value="be">Break even</option>
          </select>
        </label>
        {filteredSnapshot.trades.length === 0 && filteredSnapshot.noTradeDays.length === 0 && <p role="status" className="mt-3 text-sm text-slate-400">Nenhum registro para a data e o resultado selecionados.</p>}
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
            snapshot={filteredSnapshot}
            hidden={hidden}
            onEditTrade={onEditTrade}
            onDeleteTrade={onDeleteTrade}
            onDeleteNoTradeDay={onDeleteNoTradeDay}
          />
        ) : (
          <JournalList
            snapshot={filteredSnapshot}
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
              <p className="mt-2 text-xs font-bold text-emerald-400">{isWeekend(item.day) ? 'Dia de descanso' : '+1 dia de Ofensiva'}</p>
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
            breakEven={isBreakEven(item.trade.pnl)}
            notes={[item.trade.riskReward === undefined ? '' : `Risco/retorno ${formatRiskReward(item.trade.riskReward)}`, item.trade.notes].filter(Boolean).join(' · ')}
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
                  <td className="font-bold text-white">{trade.riskReward === undefined ? trade.asset : `${trade.asset} · R/R ${formatRiskReward(trade.riskReward)}`}</td>
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
