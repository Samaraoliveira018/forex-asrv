import { useState } from 'react';
import { Text, View } from 'react-native';
import { Card, Input, colors, spacing, typography } from '@asrv/design-system';
import { simulateRiskReturn, parseSimulationNumber } from '@asrv/backend';

const fields = [
  ['balance', 'Capital (USD)'], ['risk', 'Risco por operação (%)'],
  ['rr', 'Risco/retorno (ex.: 4 para 1:4)'], ['win', 'Acertos esperados (%)'],
  ['operations', 'Quantidade de operações'],
] as const;

export function CalculatorTab({ balance }: { balance: number }) {
  const [values, setValues] = useState({ balance: String(Math.max(0, balance).toFixed(2)), risk: '5', rr: '2', win: '50', operations: '30' });
  const capital = parseSimulationNumber(values.balance);
  const risk = parseSimulationNumber(values.risk);
  const rr = parseSimulationNumber(values.rr);
  const count = parseSimulationNumber(values.operations);
  const result = simulateRiskReturn(capital, risk, rr, parseSimulationNumber(values.win), count);
  const usd = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'USD' });
  const pct = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%';
  const signed = (value: number) => (value > 0 ? '+' : value < 0 ? '−' : '') + usd(Math.abs(value));
  const scenarios = result ? [
    { title: 'Risco composto', description: 'O risco em dólares muda a cada operação: você mantém ' + pct(risk) + ' do saldo atualizado.', balance: result.compoundedBalance },
    { title: 'Risco fixo', description: 'Você arrisca sempre ' + usd(result.riskAmount) + ', mesmo quando o saldo muda.', balance: result.fixedBalance },
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
      {result ? <View style={{ gap: spacing.md }}>
        <Card>
          <View style={{ gap: spacing.sm }}>
            <Text style={{ color: colors.text, fontSize: typography.subtitle, fontWeight: '700' }}>1. Quanto posso ganhar ou perder?</Text>
            <Text style={{ color: colors.textMuted }}>Primeira operação: RR 1:{rr}, risco de {pct(risk)} sobre {usd(capital)}.</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}><Text style={{ color: colors.textMuted }}>Se perder (Loss)</Text><Text style={{ color: colors.dangerText, fontSize: typography.subtitle, fontWeight: '700' }}>{signed(-result.riskAmount)}</Text></View>
              <View style={{ flex: 1 }}><Text style={{ color: colors.textMuted }}>Se ganhar (Win)</Text><Text style={{ color: colors.successText, fontSize: typography.subtitle, fontWeight: '700' }}>{signed(result.takeAmount)}</Text></View>
            </View>
          </View>
        </Card>
        <Card>
          <View style={{ gap: spacing.sm }}>
            <Text style={{ color: colors.text, fontSize: typography.subtitle, fontWeight: '700' }}>2. Simulação de {count} operações</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}><Text style={{ color: colors.textMuted }}>Vitórias (Win)</Text><Text style={{ color: colors.successText, fontSize: typography.subtitle, fontWeight: '700' }}>{result.wins} · {pct(result.realizedWinPct)}</Text></View>
              <View style={{ flex: 1 }}><Text style={{ color: colors.textMuted }}>Derrotas (Loss)</Text><Text style={{ color: colors.dangerText, fontSize: typography.subtitle, fontWeight: '700' }}>{result.losses} · {pct(100 - result.realizedWinPct)}</Text></View>
            </View>
            <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' }}>
              <View style={{ flex: result.wins, backgroundColor: colors.success }}/><View style={{ flex: result.losses, backgroundColor: colors.danger }}/>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: typography.caption }}>Com RR 1:{rr}, precisa acertar {pct(result.breakEvenPct)} para empatar no cálculo teórico de risco fixo, antes dos custos. Para lucrar, precisa superar essa taxa.</Text>
          </View>
        </Card>
        <Card>
          <View style={{ gap: spacing.md }}>
            <Text style={{ color: colors.text, fontSize: typography.subtitle, fontWeight: '700' }}>3. Quanto meu capital pode virar?</Text>
            <Text style={{ color: colors.textMuted }}>Capital de partida: {usd(capital)}</Text>
            {scenarios.map((scenario) => {
              const profit = scenario.balance - capital;
              const tone = profit < 0 ? colors.dangerText : profit > 0 ? colors.successText : colors.text;
              return <View key={scenario.title} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.md, gap: spacing.xs }}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: typography.subtitle }}>{scenario.title}</Text>
                <Text style={{ color: colors.textMuted }}>{scenario.description}</Text>
                <Text style={{ color: colors.textMuted, fontSize: typography.caption }}>Saldo final simulado</Text>
                <Text style={{ color: tone, fontWeight: '800', fontSize: typography.hero }}>{usd(scenario.balance)}</Text>
                <Text style={{ color: tone, fontWeight: '700' }}>{profit < 0 ? 'Prejuízo' : profit > 0 ? 'Lucro' : 'Resultado'}: {signed(profit)} ({pct(profit / capital * 100)})</Text>
              </View>;
            })}
          </View>
        </Card>
      </View> : <Text style={{ color: colors.dangerText }}>Preencha valores válidos: capital positivo, risco de 0 a 100% (maior que zero), RR de 0 a 100 (maior que zero), acerto de 0 a 100% e 1 a 1000 operações inteiras.</Text>}
      <Text style={{ color: colors.textMuted, fontSize: typography.caption }}>Simulação, não promessa de lucro. Considera apenas wins e losses completos, sem custos, slippage ou breakevens. As quantidades são arredondadas para operações inteiras. No risco fixo, o saldo teórico pode ficar negativo.</Text>
    </View>
  );
}
