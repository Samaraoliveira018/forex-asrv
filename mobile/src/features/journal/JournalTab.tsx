import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  consecutiveLossCount,
  OFFENSIVE_INTERVAL,
  grossLoss,
  historyRange,
  offensiveMilestones,
  isWeekend,
  type HistoryPeriod,
  sessionLabel,
  type JournalSnapshot,
  type Trade,
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
  colors,
  radii,
  spacing,
  typography,
} from '@asrv/design-system';
import { EquityChart } from './charts';
import { formatDate, isBreakEven, money, signedMoney, signedPercent, signedValue, today } from './format';

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
  const currentDay = today();
  const plan = snapshot.dailyPlans.find(item => item.date === currentDay);
  const todayTrades = snapshot.trades.filter(trade => trade.date === currentDay);
  const lossesToday = grossLoss(todayTrades);
  const lossCount = consecutiveLossCount(todayTrades);
  const lossTone = lossCount === 2 ? 'danger' : lossCount === 1 ? 'warning' : 'neutral';
  const filteredSnapshot = {
    ...snapshot,
    trades: datedTrades.filter(t => resultFilter === 'all' || (resultFilter === 'be' ? isBreakEven(t.pnl) : resultFilter === 'win' ? t.pnl > 0 && !isBreakEven(t.pnl) : t.pnl < 0 && !isBreakEven(t.pnl))),
    noTradeDays: snapshot.noTradeDays.filter(d => resultFilter === 'all' && inRange(d)),
  };
  const historyMoney = (value: number) => hidden ? '••••••' : `${value < 0 ? '- ' : value > 0 ? '+ ' : ''}US$ ${Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const gains = datedTrades.reduce((sum, t) => sum + Math.max(0, t.pnl), 0);
  const losses = datedTrades.reduce((sum, t) => sum + Math.min(0, t.pnl), 0);
  const { stats, discipline } = snapshot;
  const milestones = offensiveMilestones(discipline.streak);
  const nextMilestone = (Math.floor(discipline.streak / OFFENSIVE_INTERVAL) + 1) * OFFENSIVE_INTERVAL;
  const periodTone = (pnl: number) => (pnl > 0 ? 'success' : pnl < 0 ? 'danger' : 'muted');
  const periodHint = (period: (typeof stats.periods)['daily']) =>
    `Resultado: ${signedPercent(period.pct)}\nPerda: ${period.lossPct.toFixed(2)}%`;

  return (
    <View style={styles.screen}>
      <View style={styles.marketRow}>
        <SegmentedControl
          label="Mercado"
          value={market}
          onChange={onMarketChange}
          options={[
            { value: 'nacional', label: 'Nacional' },
            { value: 'internacional', label: 'Internacional' },
          ]}
        />
      </View>

      <View style={styles.actions}>
        <Badge tone="neutral" pill>Operações hoje: {stats.todayCount} (inclui BE)</Badge>
        <Badge tone={lossTone} pill>Loss seguidos: {lossCount}/2{lossCount === 2 ? ' · Stop do dia' : ''}</Badge>
        <Button variant="success" size="sm" onPress={onNoTradeDay}>
          Dia sem operar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          accessibilityLabel={hidden ? 'Mostrar valores' : 'Ocultar valores'}
          onPress={onToggleHidden}
        >
          {hidden ? 'Mostrar' : 'Ocultar'}
        </Button>
        <Button onPress={onNewTrade}>Nova operação</Button>
      </View>

      <Card>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>🏆</Text>
          <Text style={styles.sectionTitle}>Metas de Ofensiva (Disciplina Trader)</Text>
        </View>
        <Text style={styles.goal}>
          Próxima meta: {nextMilestone} dias ({discipline.streak}/{nextMilestone})
        </Text>
        <ProgressBar
          label="Progresso da ofensiva"
          value={Math.min(discipline.streak, nextMilestone)}
          max={nextMilestone}
        />
        <View style={styles.milestones}>
          {milestones.map((milestone) => {
            const reached = discipline.streak >= milestone;
            return (
              <View
                key={milestone}
                style={[styles.milestone, reached && styles.milestoneReached]}
              >
                <Text style={[styles.milestoneTitle, reached && styles.milestoneTitleReached]}>
                  {milestone} Dias
                </Text>
                <Text style={[styles.milestoneLabel, reached && styles.milestoneLabelReached]}>
                  {milestone / OFFENSIVE_INTERVAL}ª ofensiva
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      <View>
        <Text style={styles.pageTitle}>Diário de Trading</Text>
        <Text style={styles.pageSubtitle}>
          Conte todas as operações, incluindo break even. Encerre o dia após duas perdas consecutivas. Ganho ou break even interrompe a sequência. Escolha manhã ou noite. Sábado e domingo são dias sem operar.
        </Text>
      </View>

      <Text style={styles.meta}>
        {plan ? 'Checklist de hoje salvo.' : 'Checklist de hoje pendente no Plano Operacional.'}{' '}
        {plan?.lossLimit == null ? 'Limite de perda ainda sem configuração.' : `Perda hoje: ${historyMoney(lossesToday)} de ${historyMoney(plan.lossLimit)}.`}
      </Text>
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
              return <Pressable key={i} accessibilityRole="button" accessibilityLabel={`${formatDate(key)}${recorded ? ', com registros' : ''}`} accessibilityState={{ selected: selectedDate === key }} onPress={() => { setSelectedDate(key); setCalendarOpen(false); }} style={{ width: '14.2857%', minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: selectedDate === key ? '#2563eb' : 'transparent', borderRadius: 8 }}>
                <Text style={{ color: recorded ? '#34d399' : '#f8fafc', fontWeight: recorded ? '700' : '400' }}>{day}</Text>
                {recorded && <Text style={{ color: '#34d399', fontSize: 10 }}>•</Text>}
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

      <View style={styles.statsGrid}>
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
      </View>

      <View style={styles.periodGrid}>
        <StatCard
          label="Resultado Diário"
          value={signedMoney(stats.periods.daily.pnl, hidden)}
          tone={periodTone(stats.periods.daily.pnl)}
          hint={periodHint(stats.periods.daily)}
          hintTone={stats.periods.daily.pnl >= 0 ? 'success' : 'danger'}
        />
        <StatCard
          label="Resultado Semanal"
          value={signedMoney(stats.periods.weekly.pnl, hidden)}
          tone={periodTone(stats.periods.weekly.pnl)}
          hint={periodHint(stats.periods.weekly)}
          hintTone={stats.periods.weekly.pnl >= 0 ? 'success' : 'danger'}
        />
        <StatCard
          label="Resultado Mensal"
          value={signedMoney(stats.periods.monthly.pnl, hidden)}
          tone={periodTone(stats.periods.monthly.pnl)}
          hint={periodHint(stats.periods.monthly)}
          hintTone={stats.periods.monthly.pnl >= 0 ? 'success' : 'danger'}
        />
      </View>

      <Card>
        <View style={styles.chartHeader}>
          <View style={styles.flex}>
            <Text style={styles.sectionTitle}>📈 Performance do Patrimônio</Text>
            <Text style={styles.pageSubtitle}>Evolução do saldo com base nas operações</Text>
          </View>
        </View>
        <View style={styles.chartSummary}>
          <Text style={styles.meta}>Trades: {stats.totalTrades}</Text>
          <Text style={styles.meta}>Win Rate: {stats.winRate.toFixed(0)}%</Text>
          <Text style={[styles.meta, stats.totalPnl >= 0 ? styles.positive : styles.negative]}>
            P/L: {signedMoney(stats.totalPnl, hidden)}
          </Text>
        </View>
        <EquityChart
          initialBalance={snapshot.initialBalance}
          trades={snapshot.trades}
          hidden={hidden}
        />
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
        const breakEven = Math.abs(trade.pnl) <= 0.3;

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
    color: '#6b7280',
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
