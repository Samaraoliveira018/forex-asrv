import { describe, expect, it } from 'vitest';
import { colors, layout, radii, spacing, theme, typography } from './tokens';

describe('tokens', () => {
  it('mantém cores em hexadecimal', () => {
    for (const value of Object.values(colors)) {
      expect(value).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('mantém a paleta visual do index.html', () => {
    expect(colors.background).toBe('#0b0f19');
    expect(colors.surface).toBe('#111827');
    expect(colors.border).toBe('#1f2937');
    expect(colors.primary).toBe('#2563eb');
    expect(colors.success).toBe('#10b981');
    expect(colors.danger).toBe('#ef4444');
    expect(colors.orange).toBe('#f97316');
  });

  it('mantém espaçamentos positivos e crescentes', () => {
    expect(spacing.xs).toBeGreaterThan(0);
    expect(spacing.sm).toBeGreaterThan(spacing.xs);
    expect(spacing.xl).toBeGreaterThan(spacing.md);
  });

  it('expõe um tema agregado para os dois apps', () => {
    expect(theme.colors.primary).toBe(colors.primary);
    expect(theme.spacing.md).toBe(spacing.md);
    expect(theme.radii.lg).toBe(radii.lg);
    expect(theme.typography.body).toBe(typography.body);
    expect(theme.layout.sidebarWidth).toBe(layout.sidebarWidth);
  });
});
