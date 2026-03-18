// FlowVid Design System — matches desktop dark minimalist theme
export const colors = {
  // Backgrounds
  bgPrimary: '#06080e',
  bgSecondary: 'rgba(255, 255, 255, 0.03)',
  bgTertiary: 'rgba(255, 255, 255, 0.06)',
  bgCard: 'rgba(255, 255, 255, 0.03)',
  bgCardHover: 'rgba(255, 255, 255, 0.06)',
  bgGlass: 'rgba(255, 255, 255, 0.03)',
  bgGlassBorder: 'rgba(255, 255, 255, 0.06)',
  bgOverlay: 'rgba(0, 0, 0, 0.7)',

  // Primary / Accent — Flow Blue
  primary: '#00e5ff',
  primaryHover: '#00c4dd',
  primaryLight: 'rgba(0, 229, 255, 0.12)',

  // Text — clean white/gray hierarchy
  textPrimary: 'rgba(255, 255, 255, 0.93)',
  textSecondary: 'rgba(255, 255, 255, 0.55)',
  textMuted: 'rgba(255, 255, 255, 0.32)',

  // Semantic
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',

  // Accent colors
  accentBlue: '#007aff',
  accentRed: '#ef4444',
  accentGreen: '#22c55e',
  accentOrange: '#f97316',
  accentPink: '#ec4899',

  // Misc
  star: '#f59e0b',
  border: 'rgba(255, 255, 255, 0.06)',
  borderHover: 'rgba(255, 255, 255, 0.12)',
  white: '#ffffff',
  black: '#000000',

  // Badge colors
  badge4k: '#10B981',
  badgeHdr: '#F59E0B',
  badgeAtmos: '#3B82F6',
  badgeDv: '#007AFF',
  badgeInstant: '#34d399',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  round: 9999,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  hero: 40,
};

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};
