import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radii, spacing, typography } from '../tokens';

export interface TextareaProps {
  label?: string;
  value: string;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  error?: string;
  rows?: number;
}

export function Textarea({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  rows = 3,
}: TextareaProps) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline
        numberOfLines={rows}
        textAlignVertical="top"
        style={[styles.input, !!error && styles.inputError]}
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
    minHeight: 72,
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
  error: {
    color: colors.dangerText,
    fontSize: typography.caption,
  },
});
