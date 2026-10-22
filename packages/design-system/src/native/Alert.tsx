import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../tokens';

export type AlertTone = 'danger' | 'warning' | 'success';

export interface AlertProps {
  children: ReactNode;
  tone?: AlertTone;
  live?: boolean;
}

export function Alert({ children, tone = 'danger', live = true }: AlertProps) {
  return (
    <View
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}
      accessibilityLiveRegion={live ? 'polite' : undefined}
      style={[styles.alert, toneStyles[tone]]}
    >
      <Text style={[styles.text, textToneStyles[tone]]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  alert: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  text: {
    fontSize: typography.body,
    lineHeight: 20,
  },
});

const toneStyles = StyleSheet.create({
  danger: { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.45)' },
  warning: { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.45)' },
  success: { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.45)' },
});

const textToneStyles = StyleSheet.create({
  danger: { color: colors.dangerText },
  warning: { color: colors.warningText },
  success: { color: colors.successText },
});
