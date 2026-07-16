import { THEME_TOKEN_KEYS, type ThemeTokens } from '@helper/shared';

export type { ThemeTokens };

export const DEFAULT_THEME: ThemeTokens = {
  'theme.bg-primary': '#131315',
  'theme.bg-secondary': '#1c1b1d',
  'theme.bg-sidebar': 'rgba(14, 14, 16, 0.92)',
  'theme.text-primary': '#e5e1e4',
  'theme.text-secondary': '#cbc3d7',
  'theme.text-muted': '#958ea0',
  'theme.primary': '#d0bcff',
  'theme.primary-container': '#a078ff',
  'theme.accent': '#8b5cf6',
  'theme.accent-hover': '#7c3aed',
  'theme.border': 'rgba(255, 255, 255, 0.08)',
};

const CSS_VAR_MAP: Record<string, string> = {
  'theme.bg-primary': '--bg-primary',
  'theme.bg-secondary': '--bg-secondary',
  'theme.bg-sidebar': '--bg-sidebar',
  'theme.text-primary': '--text-primary',
  'theme.text-secondary': '--text-secondary',
  'theme.text-muted': '--text-muted',
  'theme.primary': '--primary',
  'theme.primary-container': '--primary-container',
  'theme.accent': '--accent',
  'theme.accent-hover': '--accent-hover',
  'theme.border': '--border',
};

export function getDefaultTheme(): ThemeTokens {
  return { ...DEFAULT_THEME };
}

export function applyTheme(settings: Record<string, unknown> | null | undefined): void {
  const merged: ThemeTokens = { ...DEFAULT_THEME };
  if (settings) {
    for (const key of THEME_TOKEN_KEYS) {
      const value = settings[key];
      if (typeof value === 'string' && value.length > 0) {
        merged[key] = value;
      }
    }
  }
  const root = document.documentElement;
  for (const [key, value] of Object.entries(merged)) {
    const cssVar = CSS_VAR_MAP[key];
    if (cssVar) root.style.setProperty(cssVar, value);
  }
}

export function themeSettingsToTokens(settings: Record<string, unknown> | null | undefined): ThemeTokens {
  const tokens: ThemeTokens = { ...DEFAULT_THEME };
  if (settings) {
    for (const key of THEME_TOKEN_KEYS) {
      const value = settings[key];
      if (typeof value === 'string' && value.length > 0) {
        tokens[key] = value;
      }
    }
  }
  return tokens;
}

export function tokensToSettings(tokens: ThemeTokens): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of THEME_TOKEN_KEYS) {
    out[key] = tokens[key];
  }
  return out;
}
