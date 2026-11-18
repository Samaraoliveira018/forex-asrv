// Paleta extraída do index.html atual. Ela é a fonte visual dos dois apps e do
// arquivo estático publicado na raiz do GitHub Pages.
export const colors = {
  background: '#101118',
  surface: '#191b26',
  surfaceAlt: '#242735',
  border: '#2e3142',
  text: '#f4f2fa',
  textMuted: '#adaebf',
  primary: '#c4b5fd',
  primaryHover: '#d6ccff',
  primaryText: '#191525',
  danger: '#e8b4bd',
  dangerText: '#e8b4bd',
  warning: '#e7d3a3',
  warningText: '#e7d3a3',
  success: '#a7dccb',
  successText: '#a7dccb',
  orange: '#c4b5fd',
  orangeText: '#d6ccff',
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
