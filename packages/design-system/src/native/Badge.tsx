import type { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, radii, spacing, typography } from '../tokens';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger';

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
}

export function Badge({ children, tone = 'neutral' }: BadgeProps) {
  return <Text style={[styles.badge, toneStyles[tone]]}>{children}</Text>;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    fontSize: typography.caption,
    fontWeight: '600',
    overflow: 'hidden',
  },
});

const toneStyles = StyleSheet.create({
  neutral: { backgroundColor: 'rgba(148, 163, 184, 0.15)', color: colors.textMuted },
  success: { backgroundColor: 'rgba(16, 185, 129, 0.15)', color: colors.success },
  warning: { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: colors.warning },
  danger: { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: colors.dangerText },
});
