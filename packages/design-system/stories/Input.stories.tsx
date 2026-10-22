import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from '../src';

const meta: Meta<typeof Input> = {
  title: 'Web/Input',
  component: Input,
  args: {
    label: 'E-mail',
    value: '',
    placeholder: 'samara@example.com',
  },
};

export default meta;

type Story = StoryObj<typeof Input>;

export const Default: Story = {};

export const Password: Story = {
  args: { label: 'Senha', type: 'password', value: 'segredo' },
};

export const WithError: Story = {
  args: {
    label: 'Ativo',
    value: 'EURUSD',
    error: 'Ativo não encontrado na corretora.',
  },
};

export const Disabled: Story = {
  args: { value: 'EURUSD', disabled: true },
};
