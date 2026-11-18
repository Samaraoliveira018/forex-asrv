import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { dailyOutcomeCounts, formatBalanceInBrl, grossLoss, isBreakEven, type JournalSnapshot, type Trade, type UsdBrlQuote } from '@asrv/backend';
import { Badge, Button, Card, ProgressBar, colors, spacing } from '@asrv/design-system';
import { money, signedMoney, today } from './format';

interface DailyHomeProps {
  snapshot: JournalSnapshot;
  hidden: boolean;
  quote: UsdBrlQuote | null | undefined;
  quoteUnavailable?: boolean;
  onRefreshQuote: () => void;
  onToggleHidden: () => void;
  onNewTrade: () => void;
  onOpenHistory: () => void;
  onOpenPlan: () => void;
  onNoTradeDay: () => void;
  onEditTrade: (trade: Trade) => void;
}

export function DailyHome({ snapshot, hidden, quote, quoteUnavailable, onRefreshQuote, onToggleHidden, onNewTrade, onOpenHistory, onOpenPlan, onNoTradeDay, onEditTrade }: DailyHomeProps) {
  const trades = snapshot.trades.filter(trade => trade.date === today());
  const counts = dailyOutcomeCounts(trades);
  const losses = grossLoss(trades);
  const stopped = counts.stops >= 2 || counts.takes >= 2 || (trades.length > 0 && losses >= snapshot.stats.dailyLossLimit);
  const checked = snapshot.dailyPlans.some(plan => plan.date === today());
  return <View style={styles.screen}>
    <Card style={styles.balance}>
      <View style={styles.row}><Text style={styles.muted}>Saldo atual</Text><Button variant="ghost" size="sm" onPress={onToggleHidden}>{hidden ? 'Mostrar' : 'Ocultar'}</Button></View>
      <Text style={styles.balanceValue}>{money(snapshot.stats.balance, hidden)}</Text>
      <Text style={styles.conversion} accessibilityLiveRegion="polite">{formatBalanceInBrl(snapshot.stats.balance, hidden, quote, quoteUnavailable)}</Text>
      <Button variant="ghost" size="sm" onPress={onRefreshQuote}>Atualizar cotação</Button>
      {quote?.source === 'ExchangeRate-API' && <Pressable accessibilityRole="link" onPress={() => { void Linking.openURL('https://www.exchangerate-api.com'); }}><Text style={styles.source}>Rates by ExchangeRate-API</Text></Pressable>}
    </Card>
    <View style={styles.counters} accessibilityLabel="Contadores de hoje">
      <Badge tone="neutral" pill>Operações hoje: {counts.operations}</Badge>
      <Badge tone={counts.stops >= 2 ? 'danger' : 'neutral'} pill>Stop Loss: {counts.stops}/2</Badge>
      <Badge tone={counts.takes >= 2 ? 'success' : 'neutral'} pill>Take Profit: {counts.takes}/2</Badge>
    </View>
    {stopped && <Text style={styles.notice} accessibilityLiveRegion="polite">Meta ou stop diário atingido. Encerre por hoje. Você pode registrar operações já realizadas.</Text>}
    <Button accessibilityLabel="Nova operação" fullWidth size="lg" onPress={onNewTrade}>+ Registrar operação</Button>
    <Text style={styles.note}>BE não conta nos limites · {counts.breakEvens} BE hoje</Text>
    <Card><View style={styles.row}><Text style={styles.muted}>Resultado de hoje</Text><Text style={[styles.result, { color: snapshot.stats.periods.daily.pnl < 0 ? colors.dangerText : colors.successText }]}>{signedMoney(snapshot.stats.periods.daily.pnl, hidden)}</Text></View>
      <Text style={styles.note}>Perda diária: {money(losses, hidden)} de {money(snapshot.stats.dailyLossLimit, hidden)}</Text>
      <ProgressBar label="Limite financeiro diário" value={losses} max={snapshot.stats.dailyLossLimit || 1} />
    </Card>
    <View><View style={styles.row}><Text style={styles.title}>Hoje</Text><Button variant="ghost" size="sm" onPress={onOpenHistory}>Ver histórico</Button></View>
      {trades.length === 0 ? <Card><Text style={styles.muted}>{snapshot.noTradeDays.includes(today()) ? 'Dia registrado sem operar.' : 'Seu diário está pronto para a primeira operação.'}</Text><Button variant="secondary" size="sm" onPress={onNoTradeDay}>Dia sem operar</Button></Card>
        : [...trades].reverse().slice(0, 4).map(trade => <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${trade.asset}`} key={trade.id} onPress={() => onEditTrade(trade)} style={styles.trade}>
          <View><Text style={styles.asset}>{trade.asset}</Text><Text style={styles.note}>{trade.session === 'night' ? 'Noite' : 'Dia'} · {trade.type}</Text></View>
          <Text style={[styles.tradeValue, { color: isBreakEven(trade.pnl) ? colors.textMuted : trade.pnl > 0 ? colors.successText : colors.dangerText }]}>{signedMoney(trade.pnl, hidden)}{isBreakEven(trade.pnl) ? ' · BE' : ''}</Text>
        </Pressable>)}
      {trades.length > 4 && <Button variant="ghost" onPress={onOpenHistory}>Ver todas as operações</Button>}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Abrir plano" onPress={onOpenPlan} style={styles.plan}>
      <Text style={styles.asset}>Plano de hoje</Text><Text style={styles.muted}>{checked ? 'Checklist salvo' : 'Checklist pendente'} →</Text>
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg },
  balance: { padding: 24, borderRadius: 22, backgroundColor: colors.surface },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  balanceValue: { color: colors.text, fontSize: 38, fontWeight: '700', letterSpacing: -1.2 },
  conversion: { color: colors.primary, fontSize: 14, lineHeight: 23, marginTop: 8 },
  source: { color: colors.textMuted, textAlign: 'center', fontSize: 11, textDecorationLine: 'underline' },
  counters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  muted: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  note: { color: colors.textMuted, fontSize: 12, lineHeight: 20 },
  notice: { color: colors.warningText, fontSize: 13, lineHeight: 20 },
  title: { color: colors.text, fontSize: 19, fontWeight: '600' },
  result: { fontSize: 18, fontWeight: '600' },
  trade: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  asset: { color: colors.text, fontSize: 14, fontWeight: '600' },
  tradeValue: { fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  plan: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
});
