import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { applyTheme } from '../lib/theme';

interface SettingsState {
  settings: Record<string, unknown>;
  refresh: () => Promise<void>;
  isLoading: boolean;
}

const SettingsContext = React.createContext<SettingsState | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const query = useQuery({
    queryKey: ['settings', 'all'],
    queryFn: async () => {
      const data = await window.api.settings.getAll();
      return data ?? {};
    },
    staleTime: 5 * 60 * 1000,
  });

  React.useEffect(() => {
    if (query.data) applyTheme(query.data);
  }, [query.data]);

  const refresh = React.useCallback(async () => {
    await query.refetch();
  }, [query]);

  const value = React.useMemo<SettingsState>(
    () => ({ settings: query.data ?? {}, refresh, isLoading: query.isLoading }),
    [query.data, refresh, query.isLoading],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettingsContext(): SettingsState {
  const ctx = React.useContext(SettingsContext);
  if (!ctx) throw new Error('useSettingsContext must be used within SettingsProvider');
  return ctx;
}
