export const colors = {
  background: '#020617',
  surface: '#0f172a',
  surfaceAlt: '#1e293b',
  border: '#334155',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  primary: '#10b981',
  primaryHover: '#34d399',
  primaryText: '#022c22',
  danger: '#ef4444',
  dangerText: '#fecaca',
  warning: '#f59e0b',
  success: '#34d399',
  white: '#ffffff',
  black: '#000000',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
} as const;

export const typography = {
  caption: 12,
  body: 14,
  subtitle: 16,
  title: 20,
  hero: 28,
} as const;

export const theme = {
  colors,
  spacing,
  radii,
  typography,
} as const;

export type Theme = typeof theme;
