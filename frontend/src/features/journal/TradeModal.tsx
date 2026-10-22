import { useEffect, useState, type FormEvent } from 'react';
import type { Trade, TradeInput, TradeType } from '@asrv/backend';
import { Button, Input, Modal, Select, Textarea } from '@asrv/design-system';

type FormState = {
  date: string;
  asset: string;
  type: TradeType;
  lots: string;
  pnl: string;
  notes: string;
};

const typeOptions = [
  { value: 'Compra', label: 'Compra (Long)' },
  { value: 'Venda', label: 'Venda (Short)' },
];

export function TradeModal({
  open,
  trade,
  onClose,
  onSubmit,
}: {
  open: boolean;
  trade: Trade | null;
  onClose: () => void;
  onSubmit: (input: TradeInput) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(() => formFor(trade));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(formFor(trade));
    setError('');
    setSaving(false);
  }, [open, trade]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!form.date || !form.asset.trim() || !form.lots.trim() || !form.pnl.trim()) {
      setError('Preencha data, ativo, lotes e resultado.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        ...(trade ? { id: trade.id } : {}),
        date: form.date,
        asset: form.asset,
        type: form.type,
        lots: numberFrom(form.lots),
        pnl: numberFrom(form.pnl),
        notes: form.notes,
      });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar a operação.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title={trade ? 'Editar Operação' : 'Registrar Nova Operação'} onClose={onClose}>
      <form className="mt-4 space-y-4 text-xs" onSubmit={handleSubmit} noValidate>
        <Input
          label="Data da Operação"
          type="date"
          value={form.date}
          required
          onChangeText={(date) => setForm((current) => ({ ...current, date }))}
        />

        <Input
          label="Ativo"
          value={form.asset}
          required
          placeholder="Ex: WIN, WTI, BTCUSD, EURUSD"
          onChangeText={(asset) => setForm((current) => ({ ...current, asset }))}
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Direção"
            value={form.type}
            options={typeOptions}
            onChange={(type) => setForm((current) => ({ ...current, type: type as TradeType }))}
          />
          <Input
            label="Lotes / Contratos"
            type="number"
            min="0.01"
            step="0.01"
            value={form.lots}
            required
            onChangeText={(lots) => setForm((current) => ({ ...current, lots }))}
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="asrv-field__label" htmlFor="pnl-input">
              Resultado Financeiro ($ / R$)
            </label>
            <button
              type="button"
              className="asrv-link"
              onClick={() => setForm((current) => ({ ...current, pnl: '0' }))}
            >
              Break Even (0x0)
            </button>
          </div>
          <Input
            id="pnl-input"
            type="number"
            step="0.01"
            value={form.pnl}
            required
            placeholder="Ex: 15, -6.50 ou 0"
            onChangeText={(pnl) => setForm((current) => ({ ...current, pnl }))}
          />
        </div>

        <Textarea
          label="Observações / Estratégia"
          value={form.notes}
          rows={2}
          placeholder="Motivo da entrada..."
          onChangeText={(notes) => setForm((current) => ({ ...current, notes }))}
        />

        {error ? (
          <p role="alert" className="asrv-alert asrv-alert--danger">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {trade ? 'Atualizar Operação' : 'Salvar Operação'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function formFor(trade: Trade | null): FormState {
  return {
    date: trade?.date ?? today(),
    asset: trade?.asset ?? '',
    type: trade?.type ?? 'Compra',
    lots: trade ? String(trade.lots) : '1',
    pnl: trade ? String(trade.pnl) : '',
    notes: trade?.notes ?? '',
  };
}

function numberFrom(value: string): number {
  return Number(value.replace(',', '.'));
}

export function today(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
