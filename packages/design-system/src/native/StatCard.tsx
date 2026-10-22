import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, spacing, typography } from '../tokens';

export type StatTone = 'default' | 'success' | 'danger' | 'muted';
export type StatHintTone = 'default' | 'success' | 'danger';

export interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  hintTone?: StatHintTone;
  icon?: ReactNode;
  tone?: StatTone;
  style?: StyleProp<ViewStyle>;
}

export function StatCard({
  label,
  value,
  hint,
  hintTone = 'default',
  icon,
  tone = 'default',
  style,
}: StatCardProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.top}>
        <Text style={styles.label}>{label}</Text>
        {icon ? <View style={styles.icon}>{icon}</View> : null}
      </View>
      <Text style={[styles.value, valueToneStyles[tone]]}>{value}</Text>
      {hint ? <Text style={[styles.hint, hintToneStyles[hintTone]]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: 2,
    flexGrow: 1,
    flexBasis: '45%',
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  icon: {
    opacity: 0.85,
  },
  label: {
    flex: 1,
    color: colors.textMuted,
    fontSize: typography.caption - 1,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  value: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  hint: {
    color: '#6b7280',
    fontSize: typography.caption - 1,
  },
});

const valueToneStyles = StyleSheet.create({
  default: { color: colors.text },
  success: { color: colors.successText },
  danger: { color: colors.dangerText },
  muted: { color: colors.textMuted },
});

const hintToneStyles = StyleSheet.create({
  default: { color: '#6b7280' },
  success: { color: colors.successText },
  danger: { color: colors.dangerText },
});
