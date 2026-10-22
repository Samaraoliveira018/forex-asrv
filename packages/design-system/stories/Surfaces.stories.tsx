import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge, Card, StatCard } from '../src';

const meta: Meta = {
  title: 'Web/Superfícies',
};

export default meta;

type Story = StoryObj;

export const CardSimples: Story = {
  render: () => (
    <Card>
      <strong>Nova operação</strong>
      <p style={{ color: '#94a3b8', marginBottom: 0 }}>
        Card base usado nos painéis do diário.
      </p>
    </Card>
  ),
};

export const Estatisticas: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(2, 1fr)' }}>
      <StatCard label="Banca" value="US$ 1.100,00" />
      <StatCard label="Ofensiva" value="7 dias" />
    </div>
  ),
};

export const Badges: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8 }}>
      <Badge>Pendente</Badge>
      <Badge tone="success">Sincronizado</Badge>
      <Badge tone="warning">Offline</Badge>
      <Badge tone="danger">Violação</Badge>
    </div>
  ),
};
