import type { ReactNode } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { colors, radii, spacing, typography } from '../tokens';

export type BadgeTone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'orange';

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  pill?: boolean;
  style?: StyleProp<TextStyle>;
}

export function Badge({ children, tone = 'neutral', pill = false, style }: BadgeProps) {
  return (
    <Text style={[styles.badge, pill && styles.pill, toneStyles[tone], style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radii.sm,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    fontSize: typography.caption,
    fontWeight: '600',
    overflow: 'hidden',
  },
  pill: {
    borderRadius: radii.full,
  },
});

const toneStyles = StyleSheet.create({
  neutral: { backgroundColor: 'rgba(148, 163, 184, 0.15)', color: colors.textMuted },
  success: { backgroundColor: 'rgba(16, 185, 129, 0.15)', color: colors.successText },
  warning: { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: colors.warningText },
  danger: { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: colors.dangerText },
  info: { backgroundColor: 'rgba(37, 99, 235, 0.18)', color: '#93c5fd' },
  orange: { backgroundColor: 'rgba(249, 115, 22, 0.16)', color: colors.orangeText },
});
