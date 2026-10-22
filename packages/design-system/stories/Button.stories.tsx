import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../src';

const meta: Meta<typeof Button> = {
  title: 'Web/Button',
  component: Button,
  args: {
    children: 'Registrar operação',
    variant: 'primary',
    size: 'md',
  },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {};

export const Secondary: Story = {
  args: { variant: 'secondary' },
};

export const Ghost: Story = {
  args: { variant: 'ghost' },
};

export const Danger: Story = {
  args: { variant: 'danger', children: 'Excluir operação' },
};

export const Loading: Story = {
  args: { loading: true, children: 'Entrando…' },
};

export const FullWidth: Story = {
  args: { fullWidth: true },
  parameters: { layout: 'padded' },
};
