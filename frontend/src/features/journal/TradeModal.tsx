import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import type { Trade, TradeInput, TradeType } from '@asrv/backend';
import { Button, Input, Modal, Select, Textarea } from '@asrv/design-system';
import { fileToScreenshotDataUrl } from './image';
import { formatDate, maskDateInput, parseDateInput } from './format';

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
  screenshotUrl,
  onClose,
  onSubmit,
}: {
  open: boolean;
  trade: Trade | null;
  screenshotUrl?: string;
  onClose: () => void;
  onSubmit: (input: TradeInput, screenshotDataUrl?: string | null) => Promise<void>;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(() => formFor(trade));
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [readingPhoto, setReadingPhoto] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const preview = photoDataUrl ?? (photoRemoved ? null : (screenshotUrl ?? null));

  useEffect(() => {
    if (!open) return;
    setForm(formFor(trade));
    setPhotoDataUrl(null);
    setPhotoRemoved(false);
    setReadingPhoto(false);
    setError('');
    setSaving(false);
  }, [open, trade]);

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');
    setReadingPhoto(true);
    try {
      setPhotoDataUrl(await fileToScreenshotDataUrl(file));
      setPhotoRemoved(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível anexar a imagem.');
    } finally {
      setReadingPhoto(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!form.date || !form.asset.trim() || !form.lots.trim() || !form.pnl.trim()) {
      setError('Preencha data, ativo, lotes e resultado.');
      return;
    }

    const isoDate = parseDateInput(form.date);
    if (!isoDate) {
      setError('Informe a data no formato dd/mm/aa.');
      return;
    }

    setSaving(true);
    try {
      const screenshot = photoDataUrl !== null ? photoDataUrl : photoRemoved ? null : undefined;
      await onSubmit(
        {
          ...(trade ? { id: trade.id } : {}),
          date: isoDate,
          asset: form.asset,
          type: form.type,
          lots: numberFrom(form.lots),
          pnl: numberFrom(form.pnl),
          notes: form.notes,
          screenshotPath: trade?.screenshotPath ?? '',
        },
        screenshot,
      );
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
          type="text"
          inputMode="numeric"
          placeholder="dd/mm/aa"
          value={form.date}
          required
          onChangeText={(date) => setForm((current) => ({ ...current, date: maskDateInput(date) }))}
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

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="asrv-field__label">Print da Operação</span>
            {preview ? (
              <button
                type="button"
                className="asrv-link"
                onClick={() => {
                  setPhotoDataUrl(null);
                  setPhotoRemoved(true);
                }}
              >
                Remover print
              </button>
            ) : null}
          </div>

          {preview ? (
            <div className="asrv-trade-card__shot">
              <img src={preview} alt="Pré-visualização do print da operação" />
            </div>
          ) : null}

          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Anexar print da operação"
            onChange={handlePhoto}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            fullWidth
            loading={readingPhoto}
            onClick={() => fileInput.current?.click()}
          >
            <i className="fa-solid fa-image" aria-hidden="true" />{' '}
            {preview ? 'Trocar print' : 'Anexar print'}
          </Button>
          <p className="mt-1 text-[11px] text-slate-400">
            Foto ou captura de tela da operação (opcional).
          </p>
        </div>

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
    date: formatDate(trade?.date ?? today()),
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
