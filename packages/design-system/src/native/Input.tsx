import { StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { colors, radii, spacing, typography } from '../tokens';

export interface InputProps {
  label?: string;
  value: string;
  onChangeText?: (value: string) => void;
  error?: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
  testID?: string;
  type?: 'text' | 'email' | 'password' | 'number';
}

export function Input({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  editable = true,
  testID,
  type,
}: InputProps) {
  const isPassword = secureTextEntry || type === 'password';

  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TextInput
        testID={testID}
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={isPassword}
        keyboardType={keyboardType ?? (type === 'email' ? 'email-address' : type === 'number' ? 'numeric' : 'default')}
        autoCapitalize={autoCapitalize ?? (type === 'email' || isPassword ? 'none' : 'sentences')}
        editable={editable}
        style={[styles.input, !!error && styles.inputError, !editable && styles.inputDisabled]}
      />

      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.caption + 1,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    color: colors.text,
    paddingVertical: spacing.sm + 1,
    paddingHorizontal: spacing.md,
    fontSize: typography.body,
  },
  inputError: {
    borderColor: colors.danger,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  error: {
    color: colors.dangerText,
    fontSize: typography.caption,
  },
});
