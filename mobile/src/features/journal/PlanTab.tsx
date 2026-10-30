import { StyleSheet, Text, View } from 'react-native';
import { MAX_STOPS_PER_SESSION, MAX_TRADES_PER_SESSION } from '@asrv/backend';
import { Card, Checkbox, colors, spacing, typography } from '@asrv/design-system';

const checklistItems = [
  'Verificar calendário de notícias',
  `Respeitar o limite de ${MAX_TRADES_PER_SESSION} trades e ${MAX_STOPS_PER_SESSION} stops por sessão (dia/noite; break even não conta)`,
  `Parar de operar na sessão após ${MAX_STOPS_PER_SESSION} stops`,
  'Mover o Stop para Break Even ao atingir a primeira parcial',
  'Se a oportunidade passou, registrar o dia sem operação',
];

export function PlanTab({
  checklist,
  onToggle,
}: {
  checklist: readonly boolean[];
  onToggle: (index: number, checked: boolean) => void;
}) {
  return (
    <View style={styles.screen}>
      <Text style={styles.pageTitle}>Plano Operacional & Disciplina</Text>

      <Card>
        <Text style={styles.sectionTitle}>Regras de Ouro da Plataforma</Text>
        <View style={styles.rules}>
          <Text style={styles.rule}>
            ⚡ Limite estrito: Máximo de {MAX_TRADES_PER_SESSION} operações por sessão (dia e
            noite). Break even não conta para o limite.
          </Text>
          <Text style={styles.rule}>
            🛑 Stops: Máximo de {MAX_STOPS_PER_SESSION} stops por sessão. Ao atingir{' '}
            {MAX_STOPS_PER_SESSION} stops no dia ou {MAX_STOPS_PER_SESSION} na noite, pare de operar
            naquela sessão para não perder a ofensiva.
          </Text>
          <Text style={styles.rule}>
            🛑 Perda Individual Máxima: Nenhuma operação pode ter prejuízo superior a 25% do
            saldo inicial do dia (capital inicial + resultado dos dias anteriores).
          </Text>
          <Text style={styles.rule}>
            ⚖️ Break Even (0x0): Posições encerradas no zero a zero preservam o capital e não
            contam no limite da sessão.
          </Text>
          <Text style={styles.rule}>
            🛡️ Saber Ficar de Fora: Registrar dias em que não operou mantém a ofensiva ativa.
          </Text>
          <Text style={styles.rule}>
            🔥 Ofensiva & Metas: Acumule dias de disciplina para alcançar 3, 7, 14, 30 e 60
            dias.
          </Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Checklist Operacional</Text>
        <View style={styles.checklist}>
          {checklistItems.map((item, index) => (
            <Checkbox
              key={item}
              label={item}
              checked={checklist[index] ?? false}
              onChange={(checked) => onToggle(index, checked)}
            />
          ))}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.lg,
  },
  pageTitle: {
    color: colors.text,
    fontSize: typography.hero,
    fontWeight: '800',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.subtitle,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  rules: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    padding: spacing.md,
  },
  rule: {
    color: colors.dangerText,
    fontSize: typography.caption,
    lineHeight: 19,
  },
  checklist: {
    gap: spacing.xs,
  },
});
