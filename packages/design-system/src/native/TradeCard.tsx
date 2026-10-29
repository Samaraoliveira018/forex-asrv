import {
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, radii, spacing, typography } from '../tokens';
import { Badge } from './Badge';

export type TradeDirection = 'Compra' | 'Venda';

export interface TradeCardProps {
  asset: string;
  date: string;
  type: TradeDirection;
  /** Sessão do mercado: `day` (dia) ou `night` (noite). */
  session?: 'day' | 'night';
  lots: number;
  pnl: number;
  notes?: string;
  /** URL assinada do print da operação (opcional). */
  screenshotUrl?: string;
  hidden?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  deleteLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function TradeCard({
  asset,
  date,
  type,
  session,
  lots,
  pnl,
  notes,
  screenshotUrl,
  hidden = false,
  onEdit,
  onDelete,
  editLabel = 'Editar',
  deleteLabel = 'Eliminar',
  style,
}: TradeCardProps) {
  const breakEven = Math.abs(pnl) <= 0.3;
  const tone = breakEven ? 'neutral' : pnl > 0 ? 'success' : 'danger';
  const pnlText = hidden
    ? '••••••'
    : breakEven
      ? `${pnl < 0 ? '-' : '+'} US$ ${Math.abs(pnl).toFixed(2)} (BE)`
      : `${pnl > 0 ? '+ ' : '- '}${Math.abs(pnl).toFixed(2)}`;
  const displayDate = shortDate(date);

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={styles.headerMain}>
          <Text style={styles.asset}>{asset}</Text>
          <Badge tone={type === 'Compra' ? 'success' : 'danger'}>{type}</Badge>
          {session ? (
            <Badge tone={session === 'night' ? 'orange' : 'info'}>
              {session === 'night' ? 'Noite' : 'Dia'}
            </Badge>
          ) : null}
          {breakEven ? <Badge tone="neutral">BREAK EVEN</Badge> : null}
        </View>
        <Text style={styles.date}>{displayDate}</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.kicker}>
          Lotes / Contratos: <Text style={styles.strong}>{lots}</Text>
        </Text>
        <Text
          style={[
            styles.pnl,
            tone === 'success' && styles.positive,
            tone === 'danger' && styles.negative,
          ]}
        >
          {pnlText}
        </Text>
        {notes ? <Text style={styles.notes}>{notes}</Text> : null}
        {screenshotUrl ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ver print da operação ${asset} de ${displayDate}`}
            onPress={() => {
              void Linking.openURL(screenshotUrl);
            }}
            style={({ pressed }) => [styles.shot, pressed && styles.pressed]}
          >
            <Image source={{ uri: screenshotUrl }} style={styles.shotImage} resizeMode="cover" />
          </Pressable>
        ) : null}
      </View>

      {onEdit || onDelete ? (
        <View style={styles.footer}>
          {onEdit ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={editLabel}
              onPress={onEdit}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            >
              <Text style={styles.actionText}>Editar</Text>
            </Pressable>
          ) : null}
          {onDelete ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={deleteLabel}
              onPress={onDelete}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            >
              <Text style={[styles.actionText, styles.danger]}>Eliminar</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  asset: {
    color: colors.text,
    fontSize: typography.caption + 1,
    fontWeight: '700',
  },
  date: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  body: {
    gap: 2,
  },
  kicker: {
    color: '#6b7280',
    fontSize: typography.caption,
  },
  strong: {
    color: '#e5e7eb',
    fontWeight: '600',
  },
  pnl: {
    color: colors.textMuted,
    fontSize: typography.subtitle,
    fontWeight: '700',
  },
  positive: {
    color: colors.successText,
  },
  negative: {
    color: colors.dangerText,
  },
  notes: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontStyle: 'italic',
  },
  shot: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  shotImage: {
    width: '100%',
    height: 140,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  action: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  actionText: {
    color: colors.primaryHover,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  danger: {
    color: colors.dangerText,
  },
});

function shortDate(value: string): string {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year.slice(-2)}` : value;
}
