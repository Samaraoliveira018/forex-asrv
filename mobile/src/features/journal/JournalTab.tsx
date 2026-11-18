import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { DailyHome } from './DailyHome';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import {
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
  colors,
  radii,
  spacing,
  typography,
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
  }, AsyncStorage), [quoteAttempt]);

  const [selectedDate, setSelectedDate] = useState('');
  const [historyPeriod, setHistoryPeriod] = useState<HistoryPeriod>('day');
  const [resultFilter, setResultFilter] = useState('all');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
  const historyMoney = (value: number) => hidden ? '••••••' : `${value < 0 ? '- ' : value > 0 ? '+ ' : ''}US$ ${Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const gains = datedTrades.reduce((sum, t) => sum + Math.max(0, t.pnl), 0);
  const losses = datedTrades.reduce((sum, t) => sum + Math.min(0, t.pnl), 0);
  const periodTone = (pnl: number) => (pnl > 0 ? 'success' : pnl < 0 ? 'danger' : 'muted');

  if (mode === 'home') return <DailyHome snapshot={snapshot} hidden={hidden}
    quote={quote ?? (quoteUnavailable ? null : undefined)} quoteUnavailable={quoteUnavailable}
    onRefreshQuote={() => setQuoteAttempt(value => value + 1)} onToggleHidden={onToggleHidden}
    onNewTrade={onNewTrade} onOpenHistory={onOpenHistory} onOpenPlan={onOpenPlan}
    onNoTradeDay={onNoTradeDay} onEditTrade={onEditTrade} />;

  return (
    <View style={styles.screen}>
      <Text style={styles.pageTitle}>Histórico</Text>
      <View style={styles.actions}><Button onPress={onNewTrade}>Nova operação</Button>
        <Button variant="ghost" accessibilityLabel={hidden ? 'Mostrar valores' : 'Ocultar valores'} onPress={onToggleHidden}>{hidden ? 'Mostrar' : 'Ocultar'}</Button>
        <Button variant="secondary" onPress={onNoTradeDay}>Dia sem operar</Button></View>
      <Card>
        <Text style={styles.sectionTitle}>Histórico do diário</Text>
        <Text style={styles.pageSubtitle}>Escolha uma data e consulte as operações do dia, da semana ou do mês.</Text>
        <Button onPress={() => setCalendarOpen(!calendarOpen)}>{selectedDate ? `Data do diário: ${formatDate(selectedDate)}` : 'Abrir calendário'}</Button>
        {calendarOpen && <View accessibilityLabel="Calendário do diário">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Button accessibilityLabel="Mês anterior" onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>‹</Button>
            <Text style={styles.meta}>{calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</Text>
            <Button accessibilityLabel="Próximo mês" onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>›</Button>
          </View>
          <View style={{ flexDirection: 'row' }}>{['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => <Text key={i} style={[styles.meta, { width: '14.2857%', textAlign: 'center' }]}>{day}</Text>)}</View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {Array.from({ length: calendarMonth.getDay() + new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate() }, (_, i) => {
              const day = i - calendarMonth.getDay() + 1;
              if (day < 1) return <View key={i} style={{ width: '14.2857%' }} />;
              const key = dateKey(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day));
              const recorded = snapshot.trades.some(t => t.date === key) || snapshot.noTradeDays.includes(key);
              return <Pressable key={i} accessibilityRole="button" accessibilityLabel={`${formatDate(key)}${recorded ? ', com registros' : ''}`} accessibilityState={{ selected: selectedDate === key }} onPress={() => { setSelectedDate(key); setCalendarOpen(false); }} style={{ width: '14.2857%', minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: selectedDate === key ? '#c4b5fd' : 'transparent', borderRadius: 8 }}>
                <Text style={{ color: recorded ? '#a7dccb' : '#f8fafc', fontWeight: recorded ? '700' : '400' }}>{day}</Text>
                {recorded && <Text style={{ color: '#a7dccb', fontSize: 10 }}>•</Text>}
              </Pressable>;
            })}
          </View>
        </View>}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button onPress={() => { const d = new Date(); setHistoryPeriod('day'); setSelectedDate(dateKey(d)); setCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1)); }}>Hoje</Button>
          <Button onPress={() => { setSelectedDate(''); setHistoryPeriod('day'); }}>Todos os dias</Button>
        </View>
        <SegmentedControl label="Período do histórico" value={historyPeriod} onChange={changeHistoryPeriod} options={[
          { value: 'day', label: 'Dia' }, { value: 'week', label: 'Semana' }, { value: 'month', label: 'Mês' },
        ]} />
        <Text style={styles.meta}>{historyLabel}{historyPeriod === 'day' && selectedDate && snapshot.noTradeDays.includes(selectedDate) ? ' · Dia registrado sem operar' : ''}</Text>
        <Text style={styles.meta}>{datedTrades.filter(t => t.pnl > 0 && !isBreakEven(t.pnl)).length} ganhos · {datedTrades.filter(t => t.pnl < 0 && !isBreakEven(t.pnl)).length} perdas · {datedTrades.filter(t => isBreakEven(t.pnl)).length} BE</Text>
        <View style={styles.statsGrid}>
          <StatCard label="Ganhos brutos" value={historyMoney(gains)} tone="success" />
          <StatCard label="Perdas brutas" value={historyMoney(losses)} tone="danger" />
          <StatCard label={range && historyPeriod === 'week' ? 'Resultado semanal' : range && historyPeriod === 'month' ? 'Resultado mensal' : 'Resultado líquido'} value={historyMoney(gains + losses)} tone={periodTone(gains + losses)} />
          <StatCard label="Operações (inclui BE)" value={String(datedTrades.length)} />
        </View>
        <SegmentedControl label="Mostrar operações" value={resultFilter} onChange={setResultFilter} options={[{ value: 'all', label: 'Todos' }, { value: 'win', label: 'Ganhos' }, { value: 'loss', label: 'Perdas' }, { value: 'be', label: 'BE' }]} />
        {filteredSnapshot.trades.length === 0 && filteredSnapshot.noTradeDays.length === 0 && <Text style={styles.meta}>Nenhum registro para a data e o resultado selecionados.</Text>}
      </Card>

      <SegmentedControl
        label="Formato do diário"
        value={view}
        onChange={onViewChange}
        options={[
          { value: 'grid', label: 'Grid Visual' },
          { value: 'list', label: 'Lista' },
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
    </View>
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
    <View style={styles.grid}>
      {items.map((item) =>
        item.kind === 'no-trade' ? (
          <NoTradeCard
            key={`nt-${item.day}`}
            day={item.day}
            onDelete={() => onDeleteNoTradeDay(item.day)}
          />
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
            notes={item.trade.notes}
            screenshotUrl={snapshot.screenshotUrls[item.trade.id]}
            hidden={hidden}
            onEdit={() => onEditTrade(item.trade)}
            onDelete={() => onDeleteTrade(item.trade)}
            editLabel={`Editar ${item.trade.asset} de ${formatDate(item.trade.date)}`}
            deleteLabel={`Excluir ${item.trade.asset} de ${formatDate(item.trade.date)}`}
            style={styles.gridItem}
          />
        ),
      )}
    </View>
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
    <Card>
      {orderedTrades.map((trade, index) => {
        const breakEven = isBreakEven(trade.pnl);

        return (
          <View key={trade.id} style={[styles.listRow, index > 0 && styles.listRowBorder]}>
            <View style={styles.listMain}>
              <Text style={styles.listAsset}>{trade.asset}</Text>
              <Text style={styles.meta}>
                {trade.date} · {sessionLabel(trade.session)} · {trade.type} · {trade.lots} lote(s)
              </Text>
              <Badge tone={breakEven ? 'neutral' : trade.pnl > 0 ? 'success' : 'danger'}>
                {breakEven ? 'BREAK EVEN' : trade.pnl > 0 ? 'WIN' : 'LOSS'}
              </Badge>
            </View>

            <View style={styles.listSide}>
              <Text
                style={[
                  styles.listPnl,
                  breakEven ? styles.muted : trade.pnl > 0 ? styles.positive : styles.negative,
                ]}
              >
                {signedValue(trade.pnl, hidden)}
              </Text>
              <View style={styles.listActions}>
                {!hidden && snapshot.screenshotUrls[trade.id] ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Ver print de ${trade.asset} de ${formatDate(trade.date)}`}
                    onPress={() => {
                      void Linking.openURL(snapshot.screenshotUrls[trade.id]);
                    }}
                    style={styles.listAction}
                  >
                    <Text style={styles.actionText}>Print</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Editar ${trade.asset} de ${formatDate(trade.date)}`}
                  onPress={() => onEditTrade(trade)}
                  style={styles.listAction}
                >
                  <Text style={styles.actionText}>Editar</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Excluir ${trade.asset} de ${formatDate(trade.date)}`}
                  onPress={() => onDeleteTrade(trade)}
                  style={styles.listAction}
                >
                  <Text style={[styles.actionText, styles.negative]}>Excluir</Text>
                </Pressable>
              </View>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

function NoTradeCard({ day, onDelete }: { day: string; onDelete: () => void }) {
  return (
    <View style={[styles.noTradeCard, styles.gridItem]}>
      <View style={styles.noTradeHeader}>
        <Text style={styles.noTradeTitle}>🛡️ Preservação de Capital</Text>
        <Text style={styles.meta}>{formatDate(day)}</Text>
      </View>
      <Text style={styles.noTradeText}>
        &quot;Mercado sem padrão claro. Decisão consciente de não operar e proteger o
        capital.&quot;
      </Text>
      <Text style={styles.noTradeStreak}>{isWeekend(day) ? 'Dia de descanso' : '+1 dia de Ofensiva'}</Text>
      <Button
        variant="danger"
        size="sm"
        accessibilityLabel={`Excluir dia sem operar ${formatDate(day)}`}
        onPress={onDelete}
      >
        Eliminar
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.lg,
  },
  marketRow: {
    alignSelf: 'stretch',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pageTitle: {
    color: colors.text,
    fontSize: typography.hero,
    fontWeight: '800',
  },
  pageSubtitle: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  periodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sectionIcon: {
    fontSize: typography.subtitle,
  },
  sectionTitle: {
    flex: 1,
    color: colors.text,
    fontSize: typography.subtitle,
    fontWeight: '700',
  },
  goal: {
    color: colors.orangeText,
    fontSize: typography.caption,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  milestones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  milestone: {
    minWidth: 64,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background,
  },
  milestoneReached: {
    borderColor: colors.orange,
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
  },
  milestoneTitle: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  milestoneTitleReached: {
    color: colors.orangeText,
  },
  milestoneLabel: {
    color: '#9698ae',
    fontSize: typography.caption - 1,
  },
  milestoneLabelReached: {
    color: colors.orangeText,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  chartSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  meta: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  positive: {
    color: colors.successText,
  },
  negative: {
    color: colors.dangerText,
  },
  muted: {
    color: colors.textMuted,
  },
  grid: {
    gap: spacing.md,
  },
  gridItem: {
    width: '100%',
  },
  noTradeCard: {
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
  },
  noTradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  noTradeTitle: {
    flex: 1,
    color: colors.successText,
    fontSize: typography.body,
    fontWeight: '700',
  },
  noTradeText: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontStyle: 'italic',
  },
  noTradeStreak: {
    color: colors.successText,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  listRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  listMain: {
    flex: 1,
    gap: 2,
  },
  listAsset: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  listSide: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  listPnl: {
    fontSize: typography.body,
    fontWeight: '700',
  },
  listActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  listAction: {
    paddingVertical: 2,
  },
  actionText: {
    color: colors.primaryHover,
    fontSize: typography.caption,
    fontWeight: '600',
  },
});
