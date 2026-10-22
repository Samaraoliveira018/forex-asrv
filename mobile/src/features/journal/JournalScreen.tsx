import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { JournalSnapshot, TradeType } from '@asrv/backend';
import {
  Badge,
  Button,
  Card,
  Input,
  StatCard,
  colors,
  spacing,
  typography,
} from '@asrv/design-system';
import { useBff } from '../../BffContext';

type FormState = {
  date: string;
  asset: string;
  type: TradeType;
  lots: string;
  pnl: string;
  notes: string;
};

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' });

export function JournalScreen({ onSignedOut }: { onSignedOut: () => void }) {
  const bff = useBff();
  const [snapshot, setSnapshot] = useState<JournalSnapshot | null>(null);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>(() => ({
    date: today(),
    asset: '',
    type: 'Compra',
    lots: '1',
    pnl: '',
    notes: '',
  }));

  const load = useCallback(async () => {
    try {
      setSnapshot(await bff.journal.list());
    } catch (cause) {
      setError(messageOf(cause));
    }
  }, [bff]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit() {
    setError('');
    setWarnings([]);

    if (!form.asset.trim() || !form.lots.trim() || !form.pnl.trim()) {
      setError('Preencha ativo, lotes e resultado.');
      return;
    }

    try {
      const result = await bff.journal.saveTrade({
        date: form.date,
        asset: form.asset,
        type: form.type,
        lots: numberFrom(form.lots),
        pnl: numberFrom(form.pnl),
        notes: form.notes,
      });

      const messages = [...result.warnings];
      if (!result.synced) {
        messages.push('Salvo no dispositivo; será enviado ao reconectar.');
      }
      setWarnings(messages);
      setForm((current) => ({ ...current, asset: '', pnl: '', notes: '' }));
      await load();
    } catch (cause) {
      setError(messageOf(cause));
    }
  }

  async function handleDelete(id: string) {
    setError('');
    try {
      await bff.journal.deleteTrade(id);
      await load();
    } catch (cause) {
      setError(messageOf(cause));
    }
  }

  async function handleNoTradeDay() {
    setError('');
    try {
      await bff.journal.registerNoTradeDay(today());
      await load();
    } catch (cause) {
      setError(messageOf(cause));
    }
  }

  async function handleSignOut() {
    try {
      await bff.auth.signOut();
    } finally {
      onSignedOut();
    }
  }

  if (!snapshot) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>Carregando diário…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Text style={styles.kicker}>DIÁRIO TRADER</Text>
          <Text style={styles.title}>ASRV</Text>
        </View>
        <Button variant="ghost" size="sm" onPress={handleSignOut}>
          Sair
        </Button>
      </View>

      {snapshot.discipline.streak > 0 ? (
        <Badge tone="success">Ofensiva de {snapshot.discipline.streak} dias</Badge>
      ) : null}

      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}

      {warnings.length > 0 ? (
        <View accessibilityLiveRegion="polite" style={styles.warnings}>
          {warnings.map((warning) => (
            <Text key={warning} style={styles.warningText}>
              {warning}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.statsGrid}>
        <StatCard label="Banca" value={money.format(snapshot.stats.balance)} />
        <StatCard label="Resultado" value={formatSigned(snapshot.stats.totalPnl)} />
        <StatCard label="Operações" value={String(snapshot.stats.totalTrades)} />
        <StatCard label="Ofensiva" value={`${snapshot.discipline.streak} dias`} />
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Nova operação</Text>

        <View style={styles.form}>
          <Input
            label="Data"
            value={form.date}
            onChangeText={(value) => setForm((current) => ({ ...current, date: value }))}
            placeholder="AAAA-MM-DD"
          />
          <Input
            label="Ativo"
            value={form.asset}
            onChangeText={(value) => setForm((current) => ({ ...current, asset: value }))}
            placeholder="EURUSD"
            autoCapitalize="characters"
          />

          <View style={styles.typeRow}>
            <Button
              testID="trade-type-Compra"
              size="sm"
              variant={form.type === 'Compra' ? 'primary' : 'secondary'}
              onPress={() => setForm((current) => ({ ...current, type: 'Compra' }))}
              style={styles.typeButton}
            >
              Compra
            </Button>
            <Button
              testID="trade-type-Venda"
              size="sm"
              variant={form.type === 'Venda' ? 'primary' : 'secondary'}
              onPress={() => setForm((current) => ({ ...current, type: 'Venda' }))}
              style={styles.typeButton}
            >
              Venda
            </Button>
          </View>

          <Input
            label="Lotes"
            type="number"
            value={form.lots}
            onChangeText={(value) => setForm((current) => ({ ...current, lots: value }))}
          />
          <Input
            label="Resultado (US$)"
            type="number"
            value={form.pnl}
            onChangeText={(value) => setForm((current) => ({ ...current, pnl: value }))}
            placeholder="-25.00"
          />
          <Input
            label="Observações"
            value={form.notes}
            onChangeText={(value) => setForm((current) => ({ ...current, notes: value }))}
            placeholder="Opcional"
          />

          <Button onPress={handleSubmit} fullWidth>
            Registrar
          </Button>
        </View>
      </Card>

      <Card>
        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>Histórico</Text>
          <Button variant="secondary" size="sm" onPress={handleNoTradeDay}>
            Hoje sem operar
          </Button>
        </View>

        {snapshot.trades.length === 0 ? (
          <Text style={styles.empty}>Nenhuma operação registrada ainda.</Text>
        ) : (
          <View style={styles.tradeList}>
            {[...snapshot.trades].reverse().map((trade) => (
              <View key={trade.id} style={styles.trade}>
                <View style={styles.tradeHeader}>
                  <View style={styles.tradeMain}>
                    <Text style={styles.asset}>{trade.asset}</Text>
                    <Text style={styles.meta}>
                      {formatDate(trade.date)} · {trade.type} · {trade.lots} lote(s)
                    </Text>
                    {trade.notes ? <Text style={styles.notes}>{trade.notes}</Text> : null}
                  </View>
                  <Text style={[styles.pnl, pnlStyle(trade.pnl)]}>{formatSigned(trade.pnl)}</Text>
                </View>

                <View style={styles.tradeFooter}>
                  <Badge tone={trade.pnl > 0 ? 'success' : trade.pnl < 0 ? 'danger' : 'neutral'}>
                    {trade.type}
                  </Badge>
                  <Button
                    variant="danger"
                    size="sm"
                    accessibilityLabel={`Excluir ${trade.asset} de ${formatDate(trade.date)}`}
                    onPress={() => handleDelete(trade.id)}
                  >
                    Excluir
                  </Button>
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
    gap: spacing.lg,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: typography.body,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerTitle: {
    gap: 2,
  },
  kicker: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 3,
  },
  title: {
    color: colors.text,
    fontSize: typography.hero,
    fontWeight: '700',
  },
  error: {
    color: colors.dangerText,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 8,
    padding: spacing.md,
    fontSize: typography.body,
  },
  warnings: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.xs,
  },
  warningText: {
    color: '#fcd34d',
    fontSize: typography.body,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.subtitle,
    fontWeight: '700',
  },
  form: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeButton: {
    flex: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  empty: {
    color: colors.textMuted,
    fontSize: typography.body,
    marginTop: spacing.md,
  },
  tradeList: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  trade: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  tradeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  tradeMain: {
    flex: 1,
    gap: 2,
  },
  asset: {
    color: colors.text,
    fontSize: typography.subtitle,
    fontWeight: '700',
  },
  meta: {
    color: colors.textMuted,
    fontSize: typography.body,
  },
  notes: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  pnl: {
    fontWeight: '700',
    fontSize: typography.body,
  },
  tradeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

function today(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function numberFrom(value: string): number {
  return Number(value.replace(',', '.'));
}

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return year && month && day ? `${day}/${month}/${year}` : isoDate;
}

function formatSigned(value: number): string {
  const formatted = money.format(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

function pnlStyle(value: number) {
  if (value > 0) return { color: colors.primary };
  if (value < 0) return { color: colors.danger };
  return { color: colors.textMuted };
}

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Algo deu errado. Tente novamente.';
}
