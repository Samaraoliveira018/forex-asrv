import { useState } from 'react';
import { CHECKLIST_SECTIONS, type DailyPlan } from '@asrv/backend';
import { Alert, Button, Card, Checkbox } from '@asrv/design-system';
import { today } from './format';

export function PlanTab({ plans, onSave }: {
  plans: readonly DailyPlan[];
  onSave: (plan: DailyPlan) => Promise<void>;
}) {
  const [date, setDate] = useState(today);
  return (
    <div className="space-y-4">
      <h1 className="asrv-page-title">Plano Operacional</h1>
      <p className="asrv-page-subtitle">Até duas operações por dia, incluindo break even, em uma única sessão. Sábado e domingo são dias sem operar.</p>
      <label className="flex flex-wrap items-center gap-3">Data do checklist
        <input type="date" value={date} max={today()} onChange={event => { if (event.target.value) setDate(event.target.value); }} className="asrv-field__input" />
      </label>
      <DailyChecklist key={date} date={date} saved={plans.find(plan => plan.date === date)} onSave={onSave} />
    </div>
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
    <Card ariaLabel="Checklist operacional diário">
      <div className="space-y-5">
        <h2 className="asrv-section-title">Checklist Operacional Diário</h2>
        <label className="block">Limite de perda diária ($ / R$)
          <input className="asrv-field__input" inputMode="decimal" value={limit} onChange={event => { setLimit(event.target.value); setStatus('Alterações pendentes de salvar.'); }} placeholder="Ex.: 10,00" />
        </label>
        <p className="asrv-page-subtitle">Defina o valor máximo de perda para esta data. O limite soma os resultados negativos, inclusive taxas registradas no break even.</p>
        <Button disabled={saving} onClick={save}>Salvar checklist e limite</Button>
        {CHECKLIST_SECTIONS.map(section => (
          <fieldset key={section.title} className="space-y-3 border-t border-slate-700 pt-3">
            <legend className="asrv-section-title">{section.title}</legend>
            {'hint' in section && <p className="asrv-page-subtitle">{section.hint}</p>}
            {section.fields.map(field => {
              const value = String(answers[field.id] ?? '');
              if ('kind' in field) return (
                <label key={field.id} className="block">{field.label}
                  <textarea className="asrv-field__input" maxLength={2000} value={value} onChange={event => answer(field.id, event.target.value)} />
                </label>
              );
              if (field.options) return (
                <label key={field.id} className="block">{field.label}
                  <select className="asrv-field__input" value={value} onChange={event => answer(field.id, event.target.value)}>
                    <option value="">Selecione</option>
                    {field.options.map(option => <option key={option}>{option}</option>)}
                  </select>
                </label>
              );
              return <Checkbox key={field.id} label={field.label} checked={answers[field.id] === true} onChange={checked => answer(field.id, checked)} />;
            })}
          </fieldset>
        ))}
        <p role="status">{status || (saved ? 'Checklist salvo para esta data.' : 'Checklist pendente para esta data.')}</p>
        {error && <Alert tone="danger">{error}</Alert>}
        <Button disabled={saving} onClick={save}>Salvar checklist e limite</Button>
      </div>
    </Card>
  );
}
