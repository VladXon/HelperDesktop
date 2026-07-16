import { useEffect, useState } from 'react';
import { applyTheme, getDefaultTheme, themeSettingsToTokens, tokensToSettings, type ThemeTokens } from '../../../lib/theme';
import { useSettings } from './useSettings';
import { useUpdateSettings } from './useUpdateSettings';

export function useTheme(): { tokens: ThemeTokens; setTokens: (t: ThemeTokens) => void; save: (t: ThemeTokens) => Promise<void>; reset: () => void; isDirty: boolean; defaultTokens: ThemeTokens } {
  const { data: settings } = useSettings();
  const update = useUpdateSettings();
  const [tokens, setLocalTokens] = useState<ThemeTokens>(getDefaultTheme());
  const [saved, setSaved] = useState<ThemeTokens>(getDefaultTheme());

  useEffect(() => {
    const next = themeSettingsToTokens(settings ?? null);
    setLocalTokens(next);
    setSaved(next);
    applyTheme(settings ?? null);
  }, [settings]);

  const setTokens = (t: ThemeTokens): void => {
    setLocalTokens(t);
    applyTheme({ ...(settings ?? {}), ...tokensToSettings(t) });
  };

  const save = async (t: ThemeTokens): Promise<void> => {
    await update.mutateAsync(tokensToSettings(t));
    setSaved(t);
  };

  const reset = (): void => {
    const def = getDefaultTheme();
    setLocalTokens(def);
    applyTheme({});
  };

  return { tokens, setTokens, save, reset, isDirty: JSON.stringify(tokens) !== JSON.stringify(saved), defaultTokens: getDefaultTheme() };
}
