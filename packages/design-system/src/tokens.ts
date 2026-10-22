// Paleta extraída do index.html atual. Ela é a fonte visual dos dois apps e do
// arquivo estático publicado na raiz do GitHub Pages.
export const colors = {
  background: '#0b0f19',
  surface: '#111827',
  surfaceAlt: '#1e293b',
  border: '#1f2937',
  text: '#f3f4f6',
  textMuted: '#9ca3af',
  primary: '#2563eb',
  primaryHover: '#3b82f6',
  primaryText: '#ffffff',
  danger: '#ef4444',
  dangerText: '#fca5a5',
  warning: '#f59e0b',
  warningText: '#fcd34d',
  success: '#10b981',
  successText: '#34d399',
  orange: '#f97316',
  orangeText: '#fdba74',
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
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const typography = {
  caption: 12,
  body: 14,
  subtitle: 16,
  title: 20,
  hero: 28,
} as const;

export const layout = {
  sidebarWidth: 256,
  topbarHeight: 64,
  contentMaxWidth: 1600,
} as const;

export const theme = {
  colors,
  spacing,
  radii,
  typography,
  layout,
} as const;

export type Theme = typeof theme;
