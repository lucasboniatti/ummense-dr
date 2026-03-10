/**
 * Design System Tokens — TypeScript Exports
 * Auto-generated from tokens.yaml
 * Version: 1.0.0
 */

// Color tokens
export const colors = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  secondary: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4',
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
  },
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  neutral: {
    0: '#ffffff',
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
} as const;

// Semantic colors
export const semanticColors = {
  background: {
    primary: colors.neutral[0],
    secondary: colors.neutral[50],
    tertiary: colors.neutral[100],
  },
  surface: {
    default: colors.neutral[0],
    hover: colors.neutral[50],
    active: colors.neutral[100],
  },
  text: {
    primary: colors.neutral[900],
    secondary: colors.neutral[700],
    tertiary: colors.neutral[500],
    inverse: colors.neutral[0],
  },
  border: {
    default: colors.neutral[200],
    subtle: colors.neutral[100],
    strong: colors.neutral[300],
  },
  interactive: {
    primary: colors.primary[600],
    secondary: colors.secondary[600],
    success: colors.success[600],
    warning: colors.warning[600],
    error: colors.error[600],
  },
} as const;

// Spacing tokens (in pixels)
export const spacing = {
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
  32: '128px',
} as const;

// Typography tokens
export const typography = {
  families: {
    sans: '"Avenir Next", "Segoe UI", system-ui, sans-serif',
    mono: '"SF Mono", Monaco, Consolas, monospace',
  },
  size: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
    '5xl': '48px',
  },
  weight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  lineHeight: {
    tight: 1.2,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
  },
} as const;

// Border radius tokens
export const radius = {
  none: '0',
  sm: '2px',
  base: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
  '3xl': '24px',
  control: '14px',
  panel: '24px',
  chip: '9999px',
  full: '9999px',
} as const;

// Shadow tokens
export const shadow = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  soft: '0 24px 48px -34px rgba(15, 23, 42, 0.32)',
  floating: '0 20px 38px -28px rgba(15, 23, 42, 0.36)',
  shell: '0 30px 60px -38px rgba(15, 23, 42, 0.4)',
} as const;

export const animation = {
  duration: {
    fast: '150ms',
    normal: '250ms',
    slow: '400ms',
  },
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;

export const elevation = {
  1: {
    shadow: shadow.soft,
    description: 'Cards, panels',
  },
  2: {
    shadow: shadow.floating,
    description: 'Dropdowns, popovers',
  },
  3: {
    shadow: shadow.shell,
    description: 'Modals, dialogs',
  },
  4: {
    shadow: '0 24px 44px -22px rgba(15, 23, 42, 0.42)',
    description: 'Toasts, notifications',
  },
} as const;

export const appTheme = {
  light: {
    canvas: '#eef4fb',
    surfacePanel: 'rgba(255, 255, 255, 0.92)',
    surfaceRaised: 'rgba(255, 255, 255, 0.98)',
    surfaceMuted: 'rgba(244, 247, 251, 0.92)',
    surfaceEmphasis: 'rgba(239, 246, 255, 0.88)',
    borderSubtle: '#d8e2ef',
    borderStrong: '#bfccdf',
    textStrong: '#0f172a',
    textMuted: '#58677c',
    accentStrong: colors.primary[700],
    accentSoft: 'rgba(37, 99, 235, 0.1)',
    focusRing: 'rgba(59, 130, 246, 0.18)',
    shadowSoft: shadow.soft,
    shadowFloating: shadow.floating,
    shadowShell: shadow.shell,
    radiusPanel: radius.panel,
    radiusControl: radius.control,
    radiusChip: radius.chip,
  },
  dark: {
    canvas: colors.neutral[900],
    surfacePanel: 'rgba(30, 41, 59, 0.92)',
    surfaceRaised: 'rgba(30, 41, 59, 0.98)',
    surfaceMuted: 'rgba(51, 65, 85, 0.92)',
    surfaceEmphasis: 'rgba(51, 65, 85, 0.88)',
    borderSubtle: colors.neutral[700],
    borderStrong: colors.neutral[600],
    textStrong: colors.neutral[50],
    textMuted: colors.neutral[400],
    accentStrong: colors.primary[400],
    accentSoft: 'rgba(96, 165, 250, 0.15)',
    focusRing: 'rgba(59, 130, 246, 0.3)',
    shadowSoft: '0 24px 48px -34px rgba(0, 0, 0, 0.5)',
    shadowFloating: '0 20px 38px -28px rgba(0, 0, 0, 0.5)',
    shadowShell: '0 30px 60px -38px rgba(0, 0, 0, 0.6)',
    radiusPanel: radius.panel,
    radiusControl: radius.control,
    radiusChip: radius.chip,
  },
} as const;

// Component tokens
export const components = {
  button: {
    padding: {
      sm: `${spacing[2]} ${spacing[3]}`,
      md: `${spacing[3]} ${spacing[4]}`,
      lg: `${spacing[4]} ${spacing[6]}`,
    },
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    borderRadius: radius.control,
  },
  input: {
    padding: `${spacing[2]} ${spacing[3]}`,
    fontSize: typography.size.base,
    borderRadius: radius.control,
    border: `1px solid ${colors.neutral[200]}`,
  },
  card: {
    padding: spacing[6],
    borderRadius: radius.panel,
    boxShadow: shadow.soft,
  },
  badge: {
    padding: `${spacing[1]} ${spacing[2]}`,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    borderRadius: radius.chip,
  },
} as const;

// Dark mode variants
export const darkMode = {
  background: {
    primary: colors.neutral[900],
    secondary: colors.neutral[800],
    tertiary: colors.neutral[700],
  },
  text: {
    primary: colors.neutral[0],
    secondary: colors.neutral[100],
    tertiary: colors.neutral[400],
  },
  border: {
    default: colors.neutral[700],
    subtle: colors.neutral[800],
    strong: colors.neutral[600],
  },
} as const;

// Export all tokens as a single object
export const tokens = {
  colors,
  semanticColors,
  spacing,
  typography,
  radius,
  shadow,
  animation,
  elevation,
  appTheme,
  components,
  darkMode,
} as const;

// Type exports for component props
export type ColorToken = typeof colors;
export type SpacingToken = typeof spacing;
export type TypographyToken = typeof typography;
export type RadiusToken = typeof radius;
export type ShadowToken = typeof shadow;
export type AnimationToken = typeof animation;
export type ElevationToken = typeof elevation;
export type ComponentToken = typeof components;
