export const THEME_TOKEN_KEYS = [
  'theme.bg-primary',
  'theme.bg-secondary',
  'theme.bg-sidebar',
  'theme.text-primary',
  'theme.text-secondary',
  'theme.text-muted',
  'theme.primary',
  'theme.primary-container',
  'theme.accent',
  'theme.accent-hover',
  'theme.border',
] as const;

export type ThemeTokenKey = (typeof THEME_TOKEN_KEYS)[number];

export type ThemeTokens = Record<ThemeTokenKey, string>;
