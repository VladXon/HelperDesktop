import * as React from 'react';

type RouteState =
  | { page: 'login' }
  | { page: 'notes'; editNoteId?: number; newNote?: boolean }
  | { page: 'presets'; newPreset?: boolean }
  | { page: 'settings' }
  | { page: 'poe-assistant' };

interface RouterState {
  current: RouteState;
  navigate: (next: RouteState) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  isCommandPaletteOpen: boolean;
}

const RouterContext = React.createContext<RouterState | null>(null);

export function RouterProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [current, setCurrent] = React.useState<RouteState>({ page: 'notes' });
  const [isCommandPaletteOpen, setPaletteOpen] = React.useState<boolean>(false);

  const navigate = React.useCallback((next: RouteState) => {
    setCurrent(next);
  }, []);

  const openCommandPalette = React.useCallback(() => setPaletteOpen(true), []);
  const closeCommandPalette = React.useCallback(() => setPaletteOpen(false), []);

  const value = React.useMemo<RouterState>(
    () => ({ current, navigate, openCommandPalette, closeCommandPalette, isCommandPaletteOpen }),
    [current, navigate, openCommandPalette, closeCommandPalette, isCommandPaletteOpen],
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterState {
  const ctx = React.useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}
