import { StyleSheet, Text, View } from 'react-native';
import type { JournalSnapshot } from '@asrv/backend';
import { Card, StatCard, colors, spacing, typography } from '@asrv/design-system';
import { DistributionBar } from './charts';

export function StatsTab({ snapshot }: { snapshot: JournalSnapshot }) {
  const { stats } = snapshot;
  const total = stats.totalTrades || 1;
  const percent = (value: number) => `${((value / total) * 100).toFixed(1)}% do total`;

  return (
    <View style={styles.screen}>
      <View>
        <Text style={styles.pageTitle}>Dados Estatísticos Detalhados</Text>
        <Text style={styles.pageSubtitle}>
          Análise de assertividade, resultados e proporção de trades
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          label="Total de Operações"
          value={String(stats.totalTrades)}
          hint={`${stats.buyCount} Compra / ${stats.sellCount} Venda`}
          style={styles.stat}
        />
        <StatCard
          label="Operações Win (Gains)"
          value={String(stats.wins)}
          hint={percent(stats.wins)}
          hintTone="success"
          tone="success"
          style={styles.stat}
        />
        <StatCard
          label="Operações Loss (Perdas)"
          value={String(stats.losses)}
          hint={percent(stats.losses)}
          hintTone="danger"
          tone="danger"
          style={styles.stat}
        />
        <StatCard
          label="Break Even (0x0)"
          value={String(stats.breakEvens)}
          hint={percent(stats.breakEvens)}
          tone="muted"
          style={styles.stat}
        />
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Distribuição (Win vs Loss vs Break Even)</Text>
        <DistributionBar
          label="Distribuição de resultados"
          segments={[
            { label: 'Gains (Win)', value: stats.wins, color: colors.success },
            { label: 'Losses (Perda)', value: stats.losses, color: colors.danger },
            { label: 'Break Even (0x0)', value: stats.breakEvens, color: '#6b7280' },
          ]}
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Proporção por Direção (Compra vs Venda)</Text>
        <DistributionBar
          label="Proporção por direção"
          segments={[
            { label: 'Compra (Long)', value: stats.buyCount, color: colors.white },
            { label: 'Venda (Short)', value: stats.sellCount, color: colors.danger },
          ]}
        />
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
});
