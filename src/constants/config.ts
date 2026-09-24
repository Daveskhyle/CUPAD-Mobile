import Constants from 'expo-constants';

/**
 * CUPAD mobile backend configuration.
 *
 * Set EXPO_PUBLIC_API_BASE_URL in the Expo environment when deploying.
 * The Expo app config provides the development/default URL.
 */
const configuredUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const expoUrl = Constants.expoConfig?.extra?.apiBaseUrl;

export const API_BASE_URL = (configuredUrl || expoUrl || '').replace(/\/$/, '');

export const APP_NAME = 'CUPAD';
export const API_TIMEOUT_MS = 20000;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const RADIUS = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
};

/** Shared brand accents (same in light & dark) */
export const BRAND = {
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  secondary: '#A855F7',
  secondaryDark: '#9333EA',
  gradientStart: '#3B82F6',
  gradientEnd: '#A855F7',
  success: '#4CAF50',
  info: '#2196F3',
  purple: '#9C27B0',
  warning: '#FFC107',
  danger: '#f44336',
  error: '#EF4444',
};

export type ThemeColors = {
  primary: string;
  primaryDark: string;
  secondary: string;
  secondaryDark: string;
  gradientStart: string;
  gradientEnd: string;
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  inputBg: string;
  inputBorder: string;
  white: string;
  black: string;
  success: string;
  info: string;
  purple: string;
  warning: string;
  danger: string;
  error: string;
  glowBlue: string;
  glowPurple: string;
  infoBg: string;
  errorBg: string;
  logoutBg: string;
  isDark: boolean;
};

export const lightColors: ThemeColors = {
  ...BRAND,
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#1E293B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  inputBg: '#F8FAFC',
  inputBorder: '#E2E8F0',
  white: '#FFFFFF',
  black: '#000000',
  glowBlue: 'rgba(59, 130, 246, 0.12)',
  glowPurple: 'rgba(168, 85, 247, 0.1)',
  infoBg: 'rgba(59,130,246,0.08)',
  errorBg: '#FEE2E2',
  logoutBg: '#FEE2E2',
  isDark: false,
};

export const darkColors: ThemeColors = {
  ...BRAND,
  primary: '#60A5FA',
  primaryDark: '#3B82F6',
  secondary: '#C084FC',
  background: '#0F172A',
  card: '#1E293B',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: 'rgba(255,255,255,0.1)',
  inputBg: '#0F172A',
  inputBorder: 'rgba(255,255,255,0.12)',
  white: '#FFFFFF',
  black: '#000000',
  glowBlue: 'rgba(59, 130, 246, 0.2)',
  glowPurple: 'rgba(168, 85, 247, 0.18)',
  infoBg: 'rgba(59,130,246,0.15)',
  errorBg: 'rgba(239, 68, 68, 0.2)',
  logoutBg: 'rgba(239, 68, 68, 0.2)',
  isDark: true,
};

/** @deprecated – use useThemeStore().colors instead */
export const COLORS = lightColors;
