import { useState } from 'react';
import { Text, View } from 'react-native';
import { CHECKLIST_SECTIONS, offensiveMilestones, type DailyPlan } from '@asrv/backend';
import { Badge, Alert, Button, Card, Checkbox, Input, Textarea, colors, spacing, typography } from '@asrv/design-system';
import { formatDate, maskDateInput, parseDateInput, today } from './format';

export function PlanTab({ plans, onSave, streak = 0 }: {
  streak?: number;
  plans: readonly DailyPlan[];
  onSave: (plan: DailyPlan) => Promise<void>;
}) {
  const [dateDraft, setDateDraft] = useState(() => formatDate(today()));
  const date = parseDateInput(dateDraft);
  return (
    <View style={{ gap: spacing.md }}>
      <Text style={{ color: colors.text, fontSize: typography.hero }}>Plano Operacional</Text>
      <Text style={{ color: colors.text }}>Encerre ao atingir 2 stops ou 2 takes no dia, somando dia e noite. Breakeven (resultado entre −US$ 2 e +US$ 2, sem os extremos) não conta nos limites. Stop financeiro: 10% do saldo de abertura. Operações fora da gestão são registradas e zeram a ofensiva.</Text>
      <Card><Text style={{ color: colors.primary, fontSize: 18 }}>Sua disciplina · {streak} dias</Text>
        <Text style={{ color: colors.textMuted }}>Próxima meta: {(Math.floor(streak / 30) + 1) * 30} dias</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{offensiveMilestones(streak).map(day => <Badge key={day} tone={streak >= day ? 'success' : 'neutral'}>{day} dias</Badge>)}</View>
      </Card>
      <Input label="Data do checklist" value={dateDraft} onChangeText={value => setDateDraft(maskDateInput(value))} keyboardType="numeric" />
      {date && date <= today() && <DailyChecklist key={date} date={date} saved={plans.find(plan => plan.date === date)} onSave={onSave} />}
    </View>
  );
}

function DailyChecklist({ date, saved, onSave }: {
  date: string;
  saved?: DailyPlan;
  onSave: (plan: DailyPlan) => Promise<void>;
}) {
  const [answers, setAnswers] = useState(saved?.answers ?? {});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  function answer(id: string, value: boolean | string) {
    setAnswers(current => ({ ...current, [id]: value }));
    setStatus('Alterações pendentes de salvar.');
  }

  async function save() {
    setSaving(true);
    setStatus('');
    setError('');
    try {
      await onSave({ date, answers, lossLimit: saved?.lossLimit ?? null });
      setStatus('Checklist salvo para esta data.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao salvar o checklist.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <View style={{ gap: spacing.md }}>
        <Text style={{ color: colors.text, fontSize: typography.subtitle }}>Checklist Operacional Diário</Text>
        <Text style={{ color: colors.text }}>O limite soma os resultados negativos desta data, inclusive taxas registradas no break even.</Text>
        <Button disabled={saving} onPress={save}>Salvar checklist</Button>
        {CHECKLIST_SECTIONS.map(section => (
          <View key={section.title} style={{ gap: spacing.sm }}>
            <Text style={{ color: colors.text, fontSize: typography.subtitle }}>{section.title}</Text>
            {'hint' in section && <Text style={{ color: colors.text }}>{section.hint}</Text>}
            {section.fields.map(field => {
              const value = String(answers[field.id] ?? '');
              if ('kind' in field) return <Textarea key={field.id} label={field.label} value={value} onChangeText={text => answer(field.id, text)} />;
              if (field.options) return (
                <View key={field.id} style={{ gap: spacing.xs }}>
                  <Text style={{ color: colors.text }}>{field.label}</Text>
                  {field.options.map(option => <Checkbox key={option} label={option} checked={value === option} onChange={checked => answer(field.id, checked ? option : '')} />)}
                </View>
              );
              return <Checkbox key={field.id} label={field.label} checked={answers[field.id] === true} onChange={checked => answer(field.id, checked)} />;
            })}
          </View>
        ))}
        <Text accessibilityLiveRegion="polite" style={{ color: colors.text }}>{status || (saved ? 'Checklist salvo para esta data.' : 'Checklist pendente para esta data.')}</Text>
        {error && <Alert tone="danger">{error}</Alert>}
        <Button disabled={saving} onPress={save}>Salvar checklist</Button>
      </View>
    </Card>
  );
}
