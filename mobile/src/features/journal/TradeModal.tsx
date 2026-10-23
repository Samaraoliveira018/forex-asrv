import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { Trade, TradeInput, TradeType } from '@asrv/backend';
import {
  Alert,
  Button,
  Input,
  Modal,
  SegmentedControl,
  Textarea,
  spacing,
  typography,
  colors,
  radii,
} from '@asrv/design-system';
import { numberFrom, today } from './format';

type FormState = {
  date: string;
  asset: string;
  type: TradeType;
  lots: string;
  pnl: string;
  notes: string;
};

const typeOptions: ReadonlyArray<{ value: TradeType; label: string }> = [
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

  async function handlePhoto() {
    setError('');

    try {
      setReadingPhoto(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.base64) return;

      const mime = asset.mimeType ?? 'image/jpeg';
      setPhotoDataUrl(`data:${mime};base64,${asset.base64}`);
      setPhotoRemoved(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível anexar o print.');
    } finally {
      setReadingPhoto(false);
    }
  }

  async function handleSubmit() {
    setError('');

    if (!form.date || !form.asset.trim() || !form.lots.trim() || !form.pnl.trim()) {
      setError('Preencha data, ativo, lotes e resultado.');
      return;
    }

    setSaving(true);
    try {
      const screenshot = photoDataUrl !== null ? photoDataUrl : photoRemoved ? null : undefined;
      await onSubmit(
        {
          ...(trade ? { id: trade.id } : {}),
          date: form.date,
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
    <Modal
      open={open}
      title={trade ? 'Editar Operação' : 'Registrar Nova Operação'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onPress={onClose}>
            Cancelar
          </Button>
          <Button loading={saving} onPress={handleSubmit}>
            {trade ? 'Atualizar Operação' : 'Salvar Operação'}
          </Button>
        </>
      }
    >
      <Input
        label="Data da Operação"
        value={form.date}
        onChangeText={(date) => setForm((current) => ({ ...current, date }))}
        placeholder="AAAA-MM-DD"
      />

      <Input
        label="Ativo"
        value={form.asset}
        onChangeText={(asset) => setForm((current) => ({ ...current, asset }))}
        placeholder="Ex: WIN, WTI, BTCUSD, EURUSD"
        autoCapitalize="characters"
      />

      <View style={styles.typeField}>
        <Text style={styles.fieldLabel}>Direção</Text>
        <SegmentedControl
          label="Direção da operação"
          value={form.type}
          onChange={(type) => setForm((current) => ({ ...current, type }))}
          options={typeOptions}
        />
      </View>

      <Input
        label="Lotes / Contratos"
        type="number"
        value={form.lots}
        onChangeText={(lots) => setForm((current) => ({ ...current, lots }))}
      />

      <View style={styles.pnlHeader}>
        <Text style={styles.fieldLabel}>Resultado Financeiro (US$ / R$)</Text>
        <Button
          variant="ghost"
          size="sm"
          onPress={() => setForm((current) => ({ ...current, pnl: '0' }))}
        >
          Break Even (0x0)
        </Button>
      </View>
      <Input
        label="Resultado"
        type="number"
        value={form.pnl}
        onChangeText={(pnl) => setForm((current) => ({ ...current, pnl }))}
        placeholder="Ex: 15, -6.50 ou 0"
      />

      <Textarea
        label="Observações / Estratégia"
        value={form.notes}
        onChangeText={(notes) => setForm((current) => ({ ...current, notes }))}
        placeholder="Motivo da entrada..."
      />

      <View style={styles.photoField}>
        <View style={styles.photoHeader}>
          <Text style={styles.fieldLabel}>Print da Operação</Text>
          {preview ? (
            <Button
              variant="ghost"
              size="sm"
              onPress={() => {
                setPhotoDataUrl(null);
                setPhotoRemoved(true);
              }}
            >
              Remover print
            </Button>
          ) : null}
        </View>

        {preview ? (
          <Image
            source={{ uri: preview }}
            style={styles.photoPreview}
            resizeMode="cover"
            accessibilityLabel="Pré-visualização do print da operação"
          />
        ) : null}

        <Button
          variant="secondary"
          size="sm"
          fullWidth
          loading={readingPhoto}
          testID="attach-screenshot"
          onPress={handlePhoto}
        >
          {preview ? 'Trocar print' : 'Anexar print'}
        </Button>
      </View>

      {error ? <Alert tone="danger">{error}</Alert> : null}
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

const styles = StyleSheet.create({
  typeField: {
    gap: spacing.xs,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: typography.caption + 1,
  },
  pnlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  photoField: {
    gap: spacing.xs,
  },
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  photoPreview: {
    width: '100%',
    height: 160,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
