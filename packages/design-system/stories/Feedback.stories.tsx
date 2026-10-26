import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  NavItem,
  ProgressBar,
  SegmentedControl,
  TradeCard,
} from '../src';

const meta: Meta = {
  title: 'Web/Feedback e navegação',
};

export default meta;

type Story = StoryObj;

export const Alertas: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 8, minWidth: 360 }}>
      <Alert tone="success">Dados sincronizados com o Supabase.</Alert>
      <Alert tone="warning">Salvo no dispositivo; será enviado ao reconectar.</Alert>
      <Alert tone="danger">Não foi possível concluir a operação.</Alert>
    </div>
  ),
};

export const Navegacao: Story = {
  render: function NavegacaoStory() {
    const [active, setActive] = useState('journal');
    return (
      <div style={{ display: 'grid', gap: 8, minWidth: 280 }}>
        <NavItem active={active === 'dashboard'} onClick={() => setActive('dashboard')}>
          Dashboard
        </NavItem>
        <NavItem active={active === 'journal'} onClick={() => setActive('journal')}>
          Diário de Trading
        </NavItem>
        <NavItem active={active === 'plan'} onClick={() => setActive('plan')}>
          Plano Operacional
        </NavItem>
      </div>
    );
  },
};

export const SegmentosEProgresso: Story = {
  render: function SegmentosStory() {
    const [value, setValue] = useState('internacional');
    return (
      <div style={{ display: 'grid', gap: 16, minWidth: 360 }}>
        <SegmentedControl
          ariaLabel="Mercado"
          value={value}
          onChange={setValue}
          options={[
            { value: 'nacional', label: 'Mercado Nacional' },
            { value: 'internacional', label: 'Mercado Internacional' },
          ]}
        />
        <ProgressBar label="Ofensiva" value={7} max={14} />
        <div style={{ display: 'flex', gap: 8 }}>
          <Badge tone="neutral" pill>
            Hoje: 0/4 trades
          </Badge>
          <Badge tone="success" pill>
            Sincronizado
          </Badge>
          <Badge tone="orange" pill>
            Ofensiva
          </Badge>
        </div>
      </div>
    );
  },
};

export const Operacoes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, minWidth: 360 }}>
      <TradeCard
        asset="EURUSD"
        date="2026-10-21"
        type="Compra"
        lots={1}
        pnl={120}
        notes="Rompimento de resistência"
        onEdit={() => undefined}
        onDelete={() => undefined}
      />
      <TradeCard asset="WIN" date="2026-10-20" type="Venda" lots={2} pnl={0.1} />
    </div>
  ),
};

export const EstadoVazio: Story = {
  render: () => (
    <div style={{ minWidth: 360 }}>
      <EmptyState>Nenhuma operação ou dia de disciplina registrado ainda.</EmptyState>
      <div style={{ marginTop: 12 }}>
        <Button variant="success">Registrar Dia Sem Operar</Button>
      </div>
    </div>
  ),
};
