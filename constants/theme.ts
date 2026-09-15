export const palette = {
  graphite: '#111318',
  cloud: '#F4F5F7',
  white: '#FFFFFF',
  black: '#08090C',
  accent: '#6C5CE7',
  accentSoft: '#E9E6FF',
  accentDark: '#9B90FF',
  slate: '#69707D',
  borderLight: '#E4E6EB',
  borderDark: '#282B33',
  danger: '#D84545',
} as const;

export const themes = {
  light: {
    background: palette.cloud,
    surface: palette.white,
    surfaceElevated: palette.white,
    text: palette.graphite,
    textSecondary: palette.slate,
    border: palette.borderLight,
    primary: palette.accent,
    primaryMuted: palette.accentSoft,
    danger: palette.danger,
  },
  dark: {
    background: palette.black,
    surface: '#14161B',
    surfaceElevated: '#1B1E25',
    text: '#F6F7F9',
    textSecondary: '#A2A8B3',
    border: palette.borderDark,
    primary: palette.accentDark,
    primaryMuted: '#292545',
    danger: '#FF7676',
  },
} as const;

export type AppTheme = (typeof themes)[keyof typeof themes];

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radii = { sm: 8, md: 14, lg: 22, pill: 999 } as const;
export const typography = { display: 34, title: 24, body: 16, label: 14, caption: 12 } as const;
