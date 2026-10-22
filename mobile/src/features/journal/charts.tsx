import { StyleSheet, Text, View } from 'react-native';
import type { Trade } from '@asrv/backend';
import { colors, radii, spacing, typography } from '@asrv/design-system';
import { money } from './format';

export function EquityChart({
  initialBalance,
  trades,
  hidden = false,
}: {
  initialBalance: number;
  trades: readonly Trade[];
  hidden?: boolean;
}) {
  if (hidden) {
    return (
      <View style={[styles.center, { minHeight: 120 }]}>
        <Text style={styles.muted}>Valores ocultos</Text>
      </View>
    );
  }

  const values = [initialBalance];
  for (const trade of trades) {
    values.push((values[values.length - 1] ?? initialBalance) + trade.pnl);
  }

  const max = Math.max(...values, initialBalance);
  const min = Math.min(...values, initialBalance);
  const range = max - min || 1;
  const last = values[values.length - 1] ?? initialBalance;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Evolução do patrimônio"
      style={styles.chart}
    >
      <View style={styles.chartHeader}>
        <Text style={styles.muted}>Início {money(initialBalance)}</Text>
        <Text style={[styles.chartValue, last >= initialBalance ? styles.positive : styles.negative]}>
          {money(last)}
        </Text>
      </View>

      <View style={styles.bars}>
        {values.map((value, index) => {
          const height = 10 + ((value - min) / range) * 70;
          return (
            <View
              key={`${index}-${value}`}
              style={[
                styles.bar,
                { height },
                value >= initialBalance ? styles.barPositive : styles.barNegative,
              ]}
            />
          );
        })}
      </View>

      <View style={styles.chartHeader}>
        <Text style={styles.tiny}>Mín. {money(min)}</Text>
        <Text style={styles.tiny}>Máx. {money(max)}</Text>
      </View>
    </View>
  );
}

export function AssetBarChart({ trades }: { trades: readonly Trade[] }) {
  const counts = new Map<string, number>();
  for (const trade of trades) {
    counts.set(trade.asset, (counts.get(trade.asset) ?? 0) + 1);
  }

  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  if (entries.length === 0) {
    return (
      <View style={[styles.center, { minHeight: 100 }]}>
        <Text style={styles.muted}>Nenhum ativo operado ainda.</Text>
      </View>
    );
  }

  const max = Math.max(...entries.map(([, count]) => count), 1);

  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Operações por ativo" style={styles.assetList}>
      {entries.map(([asset, count]) => (
        <View key={asset} style={styles.assetRow}>
          <Text style={styles.assetLabel}>{asset}</Text>
          <View style={styles.assetTrack}>
            <View style={[styles.assetBar, { width: `${(count / max) * 100}%` }]} />
          </View>
          <Text style={styles.assetCount}>{count}</Text>
        </View>
      ))}
    </View>
  );
}

export interface DistributionSegment {
  label: string;
  value: number;
  color: string;
}

export function DistributionBar({
  segments,
  label,
}: {
  segments: readonly DistributionSegment[];
  label: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const safeSegments = total > 0 ? segments : [{ label: 'Sem dados', value: 1, color: colors.border }];
  const safeTotal = total > 0 ? total : 1;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={styles.distribution}>
      <View style={styles.distributionTrack}>
        {safeSegments.map((segment) => (
          <View
            key={segment.label}
            style={{
              width: `${(segment.value / safeTotal) * 100}%`,
              backgroundColor: segment.color,
            }}
          />
        ))}
      </View>

      <View style={styles.legend}>
        {segments.map((segment) => (
          <View key={segment.label} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: segment.color }]} />
            <Text style={styles.legendText}>
              {segment.label} ({segment.value})
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  chartValue: {
    fontSize: typography.body,
    fontWeight: '700',
  },
  positive: {
    color: colors.successText,
  },
  negative: {
    color: colors.dangerText,
  },
  bars: {
    height: 90,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  bar: {
    flex: 1,
    maxWidth: 22,
    minWidth: 3,
    borderRadius: 3,
  },
  barPositive: {
    backgroundColor: colors.success,
  },
  barNegative: {
    backgroundColor: colors.danger,
  },
  muted: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  tiny: {
    color: '#6b7280',
    fontSize: typography.caption - 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetList: {
    gap: spacing.sm,
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  assetLabel: {
    width: 64,
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  assetTrack: {
    flex: 1,
    height: 10,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  assetBar: {
    height: '100%',
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  assetCount: {
    width: 20,
    color: colors.textMuted,
    fontSize: typography.caption,
    textAlign: 'right',
  },
  distribution: {
    gap: spacing.md,
  },
  distributionTrack: {
    height: 22,
    flexDirection: 'row',
    borderRadius: radii.full,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
});
