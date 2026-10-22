import { StyleSheet, View } from 'react-native';
import { colors, radii } from '../tokens';

export interface ProgressBarProps {
  value: number;
  max?: number;
  label: string;
  tone?: 'orange' | 'primary';
}

export function ProgressBar({ value, max = 100, label, tone = 'orange' }: ProgressBarProps) {
  const safeMax = max > 0 ? max : 100;
  const safeValue = Math.min(safeMax, Math.max(0, value));
  const percent = Math.min(100, Math.max(0, (safeValue / safeMax) * 100));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: safeMax, now: safeValue }}
      style={styles.track}
    >
      <View
        style={[
          styles.bar,
          { width: `${percent}%` },
          tone === 'primary' && styles.primary,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: radii.full,
    backgroundColor: '#1f2937',
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: radii.full,
    backgroundColor: colors.orange,
  },
  primary: {
    backgroundColor: colors.primary,
  },
});
