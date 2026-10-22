import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, radii, spacing, typography } from '../tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  children: ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled = false,
  testID,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const blocked = disabled || loading;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: blocked, busy: loading }}
      disabled={blocked}
      onPress={blocked ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        pressed && !blocked && styles.pressed,
        blocked && styles.blocked,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.primaryText : colors.text}
        />
      ) : null}
      <Text style={[styles.label, labelStyles[variant], labelSizes[size]]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: radii.md,
  },
  fullWidth: {
    width: '100%',
  },
  pressed: {
    opacity: 0.85,
  },
  blocked: {
    opacity: 0.55,
  },
  label: {
    fontWeight: '600',
  },
});

const sizeStyles = StyleSheet.create({
  sm: { paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.sm + 2 },
  md: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md + 2 },
  lg: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg + 2 },
});

const labelSizes = StyleSheet.create({
  sm: { fontSize: typography.caption },
  md: { fontSize: typography.body },
  lg: { fontSize: typography.subtitle },
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: 'transparent', borderColor: colors.danger },
});

const labelStyles = StyleSheet.create({
  primary: { color: colors.primaryText },
  secondary: { color: colors.text },
  ghost: { color: colors.textMuted },
  danger: { color: colors.dangerText },
});
