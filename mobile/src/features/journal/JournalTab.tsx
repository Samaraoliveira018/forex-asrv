import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { JournalSnapshot, Trade } from '@asrv/backend';
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
import { formatDate, money, signedMoney, signedValue } from './format';

export type JournalView = 'grid' | 'list';
export type Market = 'nacional' | 'internacional';

const milestones = [3, 7, 14, 30, 60] as const;
const milestoneLabels = ['Iniciante', 'Focado', 'Blindado', 'Mestre', 'Lenda'];

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
  const todayCount = stats.todayCount;

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
        <Badge
          pill
          tone={todayCount > 2 ? 'danger' : todayCount === 2 ? 'warning' : 'neutral'}
        >
          Hoje: {todayCount}/2 trades
        </Badge>
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
          {milestones.map((milestone, index) => {
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
                  {milestoneLabels[index]}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      <View>
        <Text style={styles.pageTitle}>Diário de Trading</Text>
        <Text style={styles.pageSubtitle}>
          Máx. 2 operações/dia | Nenhuma perda individual {'>'} 25% do saldo inicial do dia
        </Text>
      </View>

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
  if (snapshot.trades.length === 0) {
    return <EmptyState>Nenhum registro encontrado.</EmptyState>;
  }

  return (
    <Card>
      {snapshot.trades.map((trade, index) => {
        const breakEven = Math.abs(trade.pnl) <= 0.3;

        return (
          <View key={trade.id} style={[styles.listRow, index > 0 && styles.listRowBorder]}>
            <View style={styles.listMain}>
              <Text style={styles.listAsset}>{trade.asset}</Text>
              <Text style={styles.meta}>
                {trade.date} · {trade.type} · {trade.lots} lote(s)
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
        <Text style={styles.meta}>{day}</Text>
      </View>
      <Text style={styles.noTradeText}>
        &quot;Mercado sem padrão claro. Decisão consciente de não operar e proteger o
        capital.&quot;
      </Text>
      <Text style={styles.noTradeStreak}>+1 dia de Ofensiva 🔥</Text>
      <Button
        variant="danger"
        size="sm"
        accessibilityLabel={`Excluir dia sem operar ${day}`}
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
