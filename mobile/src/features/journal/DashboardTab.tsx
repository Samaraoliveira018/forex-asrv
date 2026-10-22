import { StyleSheet, Text, View } from 'react-native';
import type { JournalSnapshot } from '@asrv/backend';
import { Card, StatCard, colors, spacing, typography } from '@asrv/design-system';
import { AssetBarChart } from './charts';
import { money, signedMoney } from './format';

export function DashboardTab({
  snapshot,
  hidden,
}: {
  snapshot: JournalSnapshot;
  hidden: boolean;
}) {
  const { stats } = snapshot;
  const profitFactor = Number.isFinite(stats.profitFactor)
    ? stats.profitFactor.toFixed(2)
    : '∞';

  return (
    <View style={styles.screen}>
      <View>
        <Text style={styles.pageTitle}>Dashboard Geral</Text>
        <Text style={styles.pageSubtitle}>
          Visão panorâmica do seu progresso e métricas operacionais
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="Fator de Lucro" value={profitFactor} style={styles.stat} />
        <StatCard
          label="Maior Gain"
          value={`+ ${money(stats.maxWin, hidden)}`}
          tone="success"
          style={styles.stat}
        />
        <StatCard
          label="Maior Loss"
          value={`- ${money(Math.abs(stats.maxLoss), hidden)}`}
          tone="danger"
          style={styles.stat}
        />
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Distribuição de Operações por Ativo</Text>
        <AssetBarChart trades={snapshot.trades} />
      </Card>

      <View style={styles.statsGrid}>
        <StatCard label="Operações" value={String(stats.totalTrades)} style={styles.stat} />
        <StatCard label="Gains" value={String(stats.wins)} tone="success" style={styles.stat} />
        <StatCard label="Losses" value={String(stats.losses)} tone="danger" style={styles.stat} />
        <StatCard
          label="Break Evens"
          value={String(stats.breakEvens)}
          tone="muted"
          style={styles.stat}
        />
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Resultado</Text>
        <Text style={styles.text}>
          Resultado acumulado de{' '}
          <Text style={stats.totalPnl >= 0 ? styles.positive : styles.negative}>
            {signedMoney(stats.totalPnl, hidden)}
          </Text>{' '}
          sobre um capital inicial de {money(snapshot.initialBalance, hidden)}.
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.lg,
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
  stat: {
    flexBasis: '45%',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.subtitle,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  text: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: 20,
  },
  positive: {
    color: colors.successText,
    fontWeight: '700',
  },
  negative: {
    color: colors.dangerText,
    fontWeight: '700',
  },
});
