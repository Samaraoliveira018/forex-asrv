import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../tokens';

export interface StatCardProps {
  label: string;
  value: string;
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.caption - 1,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  value: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: '700',
  },
});
