import { useState } from 'react';
import { Text, View } from 'react-native';
import { Card, Input, colors, spacing, typography } from '@asrv/design-system';
import { simulateRiskReturn, parseSimulationNumber } from '@asrv/backend';

const fields = [
  ['balance', 'Capital (USD)'], ['risk', 'Risco por operação (%)'],
  ['rr', 'Retorno por 1R (ex.: 2 ou 3)'], ['win', 'Taxa de acerto (%)'],
  ['operations', 'Quantidade de operações'],
] as const;

export function CalculatorTab({ balance }: { balance: number }) {
  const [values, setValues] = useState({ balance: String(Math.max(0, balance).toFixed(2)), risk: '5', rr: '2', win: '50', operations: '30' });
  const result = simulateRiskReturn(parseSimulationNumber(values.balance), parseSimulationNumber(values.risk), parseSimulationNumber(values.rr), parseSimulationNumber(values.win), parseSimulationNumber(values.operations));
  const usd = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'USD' });
  const pct = (value: number) => value.toFixed(2) + '%';
  const rows = result ? [
    ['Taxa de loss', pct(result.lossPct)],
    ['Wins / Losses simulados', result.wins + ' / ' + result.losses],
    ['Acerto após arredondamento', pct(result.realizedWinPct)],
    ['Stop loss inicial', usd(result.riskAmount)],
    ['Take profit inicial', usd(result.takeAmount)],
    ['Acerto mínimo teórico', pct(result.breakEvenPct)],
    ['Expectativa por operação', result.expectancyR.toFixed(2) + 'R'],
    ['Saldo final · risco fixo', usd(result.fixedBalance)],
    ['Lucro / perda · risco fixo', usd(result.fixedBalance - parseSimulationNumber(values.balance))],
    ['Saldo final · risco composto', usd(result.compoundedBalance)],
    ['Lucro / perda · risco composto', usd(result.compoundedBalance - parseSimulationNumber(values.balance))],
  ] : [];

  return (
    <View style={{ gap: spacing.lg }}>
      <Text style={{ color: colors.text, fontSize: typography.hero, fontWeight: '800' }}>Calculadora de Risco/Retorno</Text>
      <Text style={{ color: colors.textMuted }}>Simule seu gerenciamento sem alterar o diário.</Text>
      <Card>
        <View style={{ gap: spacing.md }}>
          {fields.map(([key, label]) => <Input key={key} label={label} value={values[key]} keyboardType="numeric"
            onChangeText={(value) => setValues((previous) => ({ ...previous, [key]: value }))} />)}
        </View>
      </Card>
      {result ? <Card>
        <View style={{ gap: spacing.md }}>
          {rows.map(([label, value]) => <View key={label} style={{ gap: 2, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.sm }}>
            <Text style={{ color: colors.textMuted }}>{label}</Text>
            <Text style={{ color: colors.successText, fontWeight: '700', fontSize: typography.subtitle }}>{value}</Text>
          </View>)}
        </View>
      </Card> : <Text style={{ color: colors.dangerText }}>Preencha valores válidos: capital positivo, risco de 0 a 100% (maior que zero), RR de 0 a 100 (maior que zero), acerto de 0 a 100% e 1 a 1000 operações inteiras.</Text>}
      <Text style={{ color: colors.textMuted, fontSize: typography.caption }}>Simulação teórica sem custos ou breakevens. As vitórias são arredondadas para operações inteiras. Risco fixo usa o capital inicial e pode gerar saldo negativo teórico; composto recalcula o risco a cada operação. Não é previsão de lucro.</Text>
    </View>
  );
}
