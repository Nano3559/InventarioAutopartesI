// Design System Tokens — AutoPartes Pro (Unified Dark & Light)
// Single source of truth. All components consume these.
// Web uses dark theme; mobile defaults to light but supports dark for login.

// ──────────────────────────────────────────────
// COLOR PRIMITIVES (LIGHT - default mobile)
// ──────────────────────────────────────────────
export const lightColors = {
  // Base
  white: '#FFFFFF',
  bg: '#FAFAFA',
  card: '#FFFFFF',

  // Borders
  border: '#E4E4E7',
  borderStrong: '#D4D4D8',

  // Text
  text: '#18181B',
  textMuted: '#71717A',
  textPlaceholder: '#A1A1AA',
  textOnPrimary: '#FFFFFF',

  // Brand (matching web accent #38bdf8)
  blue: '#38bdf8',
  blueSoft: 'rgba(56, 189, 248, 0.12)',
  blueStrong: '#0284c7',

  // Semantic
  emerald: '#10B981',
  emeraldSoft: '#ECFDF5',
  amber: '#F59E0B',
  amberSoft: '#FFFAEB',
  crimson: '#EF4444',
  crimsonSoft: '#FEF2F2',

  // Semantic mappings
  primary: '#38bdf8',
  primarySoft: 'rgba(56, 189, 248, 0.12)',
  primaryStrong: '#0284c7',
  success: '#10B981',
  successSoft: '#ECFDF5',
  warning: '#F59E0B',
  warningSoft: '#FFFAEB',
  danger: '#EF4444',
  dangerSoft: '#FEF2F2',

  // Native platform adaptations
  systemPrimary: '#38bdf8',
  systemPrimaryContainer: 'rgba(56, 189, 248, 0.12)',
  systemSecondary: '#64748B',
  systemSecondaryContainer: '#F1F5F9',
  systemSurface: '#FFFFFF',
  systemSurfaceVariant: '#F8FAFC',
  systemBackground: '#FAFAFA',
  systemError: '#EF4444',
  systemErrorContainer: '#FEF2F2',
  systemOutline: '#E4E4E7',
  systemOnSurface: '#18181B',
  systemOnSurfaceVariant: '#71717A',
  systemOnPrimary: '#FFFFFF',
} as const;

// ──────────────────────────────────────────────
// COLOR PRIMITIVES (DARK - matching web)
// ──────────────────────────────────────────────
export const darkColors = {
  // Base (web: #0b0f14, #10161e, #141b24)
  white: '#FFFFFF',
  bg: '#0b0f14',
  bgAlt: '#10161e',
  card: '#141b24',
  cardHover: '#1a2230',

  // Borders
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.15)',

  // Text
  text: '#c7cfda',
  textStrong: '#f2f5f9',
  textMuted: '#8b96a5',
  textPlaceholder: 'rgba(139, 150, 165, 0.5)',
  textOnPrimary: '#0b0f14',

  // Brand (web accent: #38bdf8)
  blue: '#38bdf8',
  blueSoft: 'rgba(56, 189, 248, 0.12)',
  blueStrong: '#7dd3fc',

  // Semantic
  emerald: '#10B981',
  emeraldSoft: 'rgba(16, 185, 129, 0.12)',
  amber: '#F59E0B',
  amberSoft: 'rgba(245, 158, 11, 0.12)',
  crimson: '#EF4444',
  crimsonSoft: 'rgba(239, 68, 68, 0.12)',

  // Semantic mappings
  primary: '#38bdf8',
  primarySoft: 'rgba(56, 189, 248, 0.12)',
  primaryStrong: '#0284c7',
  success: '#10B981',
  successSoft: 'rgba(16, 185, 129, 0.12)',
  warning: '#F59E0B',
  warningSoft: 'rgba(245, 158, 11, 0.12)',
  danger: '#EF4444',
  dangerSoft: 'rgba(239, 68, 68, 0.12)',

  // Native platform adaptations
  systemPrimary: '#38bdf8',
  systemPrimaryContainer: 'rgba(56, 189, 248, 0.12)',
  systemSecondary: '#64748B',
  systemSecondaryContainer: '#1e293b',
  systemSurface: '#141b24',
  systemSurfaceVariant: '#1e293b',
  systemBackground: '#0b0f14',
  systemError: '#EF4444',
  systemErrorContainer: 'rgba(239, 68, 68, 0.12)',
  systemOutline: 'rgba(255, 255, 255, 0.08)',
  systemOnSurface: '#c7cfda',
  systemOnSurfaceVariant: '#8b96a5',
  systemOnPrimary: '#0b0f14',
} as const;

// Default export for backward compatibility (light theme)
export const colors = lightColors;

// ──────────────────────────────────────────────
// THEME MODE
// ──────────────────────────────────────────────
export type ColorMode = 'light' | 'dark';

export function getColors(mode: ColorMode = 'light') {
  return mode === 'dark' ? darkColors : lightColors;
}

// ──────────────────────────────────────────────
// SPACING (8px base grid)
// ──────────────────────────────────────────────
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
} as const;

export const space = {
  none: spacing[0],
  xs: spacing[1],    // 4
  sm: spacing[2],    // 8
  md: spacing[3],    // 12
  lg: spacing[4],    // 16
  xl: spacing[5],    // 20
  '2xl': spacing[6], // 24
  '3xl': spacing[8], // 32
  '4xl': spacing[10], // 40
} as const;

// ──────────────────────────────────────────────
// TYPOGRAPHY
// ──────────────────────────────────────────────
export const fontFamily = {
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  mono: 'Inter_400Regular',
  monoMedium: 'Inter_500Medium',
  monoBold: 'Inter_700Bold',
} as const;

export const fontSize = {
  caption: 12,
  captionStrong: 12,
  body: 16,
  bodyStrong: 16,
  headline: 18,
  title: 20,
  display: 28,
  data: 16,
  dataLg: 20,
  // Dynamic Type support - these are base sizes
  // For true Dynamic Type, use useScaledFonts hook
} as const;

export const lineHeight = {
  body: 24,
  heading: 28,
  mono: 20,
  tight: 1.2,
  relaxed: 1.5,
} as const;

// ──────────────────────────────────────────────
// BORDER RADIUS
// ──────────────────────────────────────────────
export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

// ──────────────────────────────────────────────
// TOUCH TARGETS (iOS 44pt / Android 48dp minimum)
// ──────────────────────────────────────────────
export const touchTarget = {
  min: 48,
  comfortable: 56,
  listRow: 56,
  listRowComfortable: 64,
  buttonHeight: {
    sm: 40,
    md: 48,
    lg: 56,
  },
} as const;

// ──────────────────────────────────────────────
// BUTTON SPECS
// ──────────────────────────────────────────────
export const button = {
  height: {
    sm: 40,
    md: 48,
    lg: 56,
  },
  paddingX: {
    sm: 12,
    md: 16,
    lg: 24,
  },
  radius: 12,
  iconSize: 20,
} as const;

// ──────────────────────────────────────────────
// INPUT SPECS
// ──────────────────────────────────────────────
export const input = {
  height: 48,
  borderWidth: 1,
  borderWidthFocused: 2,
  radius: 10,
  paddingHorizontal: 16,
  paddingVertical: 0,
} as const;

// ──────────────────────────────────────────────
// TAB BAR (iOS 49pt / Android 56dp standard)
// ──────────────────────────────────────────────
export const tabBar = {
  height: 56,
  heightWithSafeArea: 56 + 34, // for home indicator
  iconSize: 24,
  labelFontSize: 11,
  labelFontSizeLarge: 12,
  indicatorHeight: 3,
} as const;

// ──────────────────────────────────────────────
// HEADER / NAV BAR
// ──────────────────────────────────────────────
export const header = {
  height: 56,
  heightWithStatusBar: 56 + 44, // iOS status bar
  titleFontSize: 18,
  titleFontWeight: '600',
} as const;

// ──────────────────────────────────────────────
// DENSITY MODES
// ──────────────────────────────────────────────
export const density = {
  comfortable: 1.0,
  compact: 0.9,
} as const;

// ──────────────────────────────────────────────
// BREAKPOINTS (for adaptive layouts)
// ──────────────────────────────────────────────
export const breakpoints = {
  phone: 480,
  tablet: 768,
  desktop: 1024,
} as const;

// ──────────────────────────────────────────────
// SHADOWS / ELEVATION (per color mode)
// ──────────────────────────────────────────────

// Light mode shadows (subtle, gray-based)
export const lightShadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  level1: { // Card, low elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  level2: { // Sheet, medium elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  level3: { // Modal, FAB, high elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  level4: { // Drawer, top app bar
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// Dark mode shadows (stronger, matching web aesthetic)
export const darkShadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  level1: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  level2: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  level3: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 12,
  },
  level4: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.45,
    shadowRadius: 48,
    elevation: 16,
  },
  // Web-style glow shadows
  glowPrimary: {
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  glowSuccess: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  glowWarning: {
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  glowDanger: {
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;

// Default shadows (light mode for backward compat)
export const shadows = lightShadows;

export function getShadows(mode: ColorMode = 'light') {
  return mode === 'dark' ? darkShadows : lightShadows;
}

// ──────────────────────────────────────────────
// OPACITY STATES
// ──────────────────────────────────────────────
export const opacity = {
  disabled: 0.38,
  pressed: 0.88,
  hover: 0.95,
  focus: 0.9,
  skeleton: 0.5,
  overlay: 0.5,
} as const;

// ──────────────────────────────────────────────
// ANIMATION (respects prefers-reduced-motion)
// ──────────────────────────────────────────────
export const motion = {
  instant: 0,
  fast: 100,
  normal: 200,
  modal: 250,
  countUp: 300,
  skeleton: 1200,
} as const;

export const easing = {
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  easeOut: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// ──────────────────────────────────────────────
// ICON SIZES
// ──────────────────────────────────────────────
export const iconSize = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 32,
  '2xl': 40,
} as const;

// ──────────────────────────────────────────────
// COMPONENT STYLE HELPERS (factory functions for dynamic colors)
// ──────────────────────────────────────────────

export function createComponentStyles(mode: ColorMode = 'light') {
  const c = getColors(mode);
  const s = getShadows(mode);

  return {
    btnPrimary: {
      backgroundColor: c.primary,
      borderWidth: 0,
    },
    btnSecondary: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.primary,
    },
    btnGhost: {
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
    btnDanger: {
      backgroundColor: c.danger,
      borderWidth: 0,
    },
    btnOutline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: c.border,
    },

    inputBase: {
      height: input.height,
      backgroundColor: mode === 'dark' ? c.card : c.white,
      borderWidth: input.borderWidth,
      borderColor: c.border,
      borderRadius: input.radius,
      color: c.text,
      fontSize: fontSize.body,
      fontFamily: fontFamily.sans,
      paddingHorizontal: input.paddingHorizontal,
      paddingVertical: input.paddingVertical,
    },
    inputFocused: {
      borderColor: c.primary,
      borderWidth: input.borderWidthFocused,
    },
    inputError: {
      borderColor: c.danger,
      borderWidth: input.borderWidthFocused,
    },
    inputDisabled: {
      backgroundColor: c.bg,
      borderColor: c.border,
      color: c.textMuted,
    },

    row: {
      minHeight: touchTarget.listRow,
      paddingHorizontal: space.lg,
      paddingVertical: space.md,
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    rowComfortable: {
      minHeight: touchTarget.listRowComfortable,
    },
    rowSelected: {
      backgroundColor: c.primarySoft,
      borderLeftWidth: 3,
      borderLeftColor: c.primary,
    },

    card: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      padding: space.lg,
      ...s.level1,
    },
    cardElevated: {
      backgroundColor: c.card,
      borderWidth: 0,
      borderRadius: radius.md,
      padding: space.lg,
      ...s.level2,
    },
    cardCompact: {
      padding: space.md,
    },
    cardOutlined: {
      borderWidth: 1,
      borderColor: c.border,
    },
    // Dark mode glassmorphism card (matching web)
    cardGlass: mode === 'dark' ? {
      backgroundColor: 'rgba(20, 27, 36, 0.75)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.08)',
      borderRadius: radius.xl,
      padding: space.xl,
      ...s.level3,
    } : {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      padding: space.lg,
      ...s.level1,
    },

    badge: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: radius.full,
      fontSize: fontSize.caption,
      fontFamily: fontFamily.sansSemiBold,
    },
    badgeDot: {
      width: 8,
      height: 8,
      borderRadius: radius.full,
    },

    tabBar: {
      height: tabBar.height,
      backgroundColor: mode === 'dark' ? c.card : c.white,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingBottom: 0,
    },

    header: {
      height: header.height,
      backgroundColor: mode === 'dark' ? c.card : c.white,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      paddingHorizontal: space.lg,
    },

    section: {
      gap: space.md,
    },

    divider: {
      height: 1,
      backgroundColor: c.border,
    },
    dividerInset: {
      marginLeft: space.lg,
    },

    // Screen content container
    screenContent: {
      padding: space.lg,
      gap: space['2xl'],
    },
    screenContentCompact: {
      padding: space.md,
      gap: space.xl,
    },
  } as const;
}

// Default component styles (light mode for backward compat)
export const componentStyles = createComponentStyles('light');

// ──────────────────────────────────────────────
// ACCESSIBILITY HELPERS
// ──────────────────────────────────────────────
export const a11y = {
  // Standard accessibility traits/roles
  button: 'button',
  link: 'link',
  header: 'header',
  search: 'search',
  adjustable: 'adjustable',
  image: 'image',
  text: 'text',
  form: 'form',
  alert: 'alert',
  checkbox: 'checkbox',

  // Common labels
  close: 'Cerrar',
  back: 'Volver',
  menu: 'Menú',
  more: 'Más opciones',
  loading: 'Cargando',
  error: 'Error',
  success: 'Éxito',
  warning: 'Advertencia',
} as const;