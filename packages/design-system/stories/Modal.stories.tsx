import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Input, Modal, Select, Textarea } from '../src';

const meta: Meta = {
  title: 'Web/Modal de operação',
};

export default meta;

type Story = StoryObj;

export const RegistrarOperacao: Story = {
  render: function RegistrarOperacaoStory() {
    const [open, setOpen] = useState(true);
    const [asset, setAsset] = useState('EURUSD');
    const [type, setType] = useState('Compra');
    const [lots, setLots] = useState('1');
    const [pnl, setPnl] = useState('');
    const [notes, setNotes] = useState('');

    return (
      <>
        <Button onClick={() => setOpen(true)}>Abrir modal</Button>
        <Modal
          open={open}
          title="Registrar Nova Operação"
          onClose={() => setOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setOpen(false)}>Salvar Operação</Button>
            </>
          }
        >
          <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
            <Input label="Data da Operação" type="date" value="2026-10-22" onChangeText={() => undefined} />
            <Input label="Ativo" value={asset} onChangeText={setAsset} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Select
                label="Direção"
                value={type}
                onChange={setType}
                options={[
                  { value: 'Compra', label: 'Compra (Long)' },
                  { value: 'Venda', label: 'Venda (Short)' },
                ]}
              />
              <Input label="Lotes / Contratos" type="number" value={lots} onChangeText={setLots} />
            </div>
            <Input
              label="Resultado Financeiro ($ / R$)"
              type="number"
              value={pnl}
              onChangeText={setPnl}
              placeholder="Ex: 15, -6.50 ou 0"
            />
            <Textarea
              label="Observações / Estratégia"
              value={notes}
              onChangeText={setNotes}
              placeholder="Motivo da entrada..."
            />
          </div>
        </Modal>
      </>
    );
  },
};
