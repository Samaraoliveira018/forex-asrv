import { useState } from 'react';
import { Text, View } from 'react-native';
import { CHECKLIST_SECTIONS, type DailyPlan } from '@asrv/backend';
import { Alert, Button, Card, Checkbox, Input, Textarea, colors, spacing, typography } from '@asrv/design-system';
import { formatDate, maskDateInput, parseDateInput, today } from './format';

export function PlanTab({ plans, onSave }: {
  plans: readonly DailyPlan[];
  onSave: (plan: DailyPlan) => Promise<void>;
}) {
  const [dateDraft, setDateDraft] = useState(() => formatDate(today()));
  const date = parseDateInput(dateDraft);
  return (
    <View style={{ gap: spacing.md }}>
      <Text style={{ color: colors.text, fontSize: typography.hero }}>Plano Operacional</Text>
      <Text style={{ color: colors.text }}>Conte todas as operações, incluindo break even. Encerre o dia após duas perdas consecutivas. Ganho ou break even interrompe a sequência. Escolha manhã ou noite. Sábado e domingo são dias sem operar.</Text>
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
  const [limit, setLimit] = useState(saved?.lossLimit?.toString() ?? '');
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
      await onSave({ date, answers, lossLimit: limit.trim() ? Number(limit.replace(',', '.')) : null });
      setStatus('Checklist e limite salvos para esta data.');
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
        <Input label="Limite de perda diária ($ / R$)" value={limit} onChangeText={value => { setLimit(value); setStatus('Alterações pendentes de salvar.'); }} keyboardType="decimal-pad" placeholder="Ex.: 10,00" />
        <Text style={{ color: colors.text }}>O limite soma os resultados negativos desta data, inclusive taxas registradas no break even.</Text>
        <Button disabled={saving} onPress={save}>Salvar checklist e limite</Button>
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
        <Button disabled={saving} onPress={save}>Salvar checklist e limite</Button>
      </View>
    </Card>
  );
}
