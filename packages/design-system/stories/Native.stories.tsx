import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge, Button, Card, Input, StatCard } from '../src/index.native';

const meta: Meta = {
  title: 'Mobile/Componentes',
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj;

export const Botoes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, width: 320 }}>
      <Button onPress={() => undefined}>Registrar operação</Button>
      <Button variant="secondary" onPress={() => undefined}>
        Hoje sem operar
      </Button>
      <Button variant="ghost" onPress={() => undefined}>
        Sair
      </Button>
      <Button variant="danger" onPress={() => undefined}>
        Excluir operação
      </Button>
      <Button loading>Entrando…</Button>
    </div>
  ),
};

export const Formulario: Story = {
  render: () => (
    <Card style={{ width: 320, gap: 12 }}>
      <Input label="E-mail" type="email" value="samara@example.com" />
      <Input label="Senha" type="password" value="segredo" />
      <Input label="Ativo" value="EURUSD" />
      <Input label="Resultado (US$)" type="number" value="-25" error="Revise o resultado." />
      <Button fullWidth onPress={() => undefined}>
        Entrar
      </Button>
    </Card>
  ),
};

export const Superficies: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, width: 320 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <Badge>Pendente</Badge>
        <Badge tone="success">Sincronizado</Badge>
        <Badge tone="warning">Offline</Badge>
        <Badge tone="danger">Violação</Badge>
      </div>
      <StatCard label="Banca" value="US$ 1.100,00" />
      <StatCard label="Ofensiva" value="7 dias" />
    </div>
  ),
};
