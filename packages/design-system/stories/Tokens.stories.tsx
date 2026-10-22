import type { Meta, StoryObj } from '@storybook/react-vite';
import { colors, radii, spacing, typography } from '../src';

const meta: Meta = {
  title: 'Fundamentos/Tokens',
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj;

export const Cores: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 140px)', gap: 12 }}>
      {Object.entries(colors).map(([name, value]) => (
        <div key={name}>
          <div
            style={{
              height: 56,
              borderRadius: radii.md,
              border: '1px solid #334155',
              background: value,
            }}
          />
          <code style={{ fontSize: 12 }}>{name}</code>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>{value}</div>
        </div>
      ))}
    </div>
  ),
};

export const Espacamentos: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 8 }}>
      {Object.entries(spacing).map(([name, value]) => (
        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <code style={{ width: 48 }}>{name}</code>
          <div style={{ height: 12, width: value * 4, background: '#10b981' }} />
          <span style={{ fontSize: 12, color: '#94a3b8' }}>{value}px</span>
        </div>
      ))}
    </div>
  ),
};

export const Tipografia: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 8 }}>
      {Object.entries(typography).map(([name, size]) => (
        <p key={name} style={{ margin: 0, fontSize: size }}>
          {name} — {size}px
        </p>
      ))}
    </div>
  ),
};
