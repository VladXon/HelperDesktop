import * as React from 'react';
import { useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { QueryProvider } from './providers/QueryProvider';
import { SettingsProvider } from './providers/SettingsProvider';
import { AuthProvider, useAuth } from './providers/AuthProvider';
import { RouterProvider, useRouter } from './providers/RouterProvider';
import { TooltipProvider } from './components/ui/tooltip';
import { LoginScreen } from './features/auth';
import { Titlebar, Sidebar, CommandPalette } from './features/layout';
import { NotesPage } from './features/notes';
import { PresetsPage } from './features/presets';
import { SettingsPage } from './features/settings';
import { AiInspectorOverlay } from './features/ai-inspector';
import { onNoteLink } from './lib/deep-link';

function MainApp(): React.JSX.Element {
  const { current, navigate, openCommandPalette, closeCommandPalette, isCommandPaletteOpen } = useRouter();
  const { user } = useAuth();

  useHotkeys('ctrl+k', (e) => { e.preventDefault(); openCommandPalette(); }, { enableOnFormTags: true });
  useHotkeys('escape', () => { if (isCommandPaletteOpen) closeCommandPalette(); }, { enableOnFormTags: true });
  useHotkeys('ctrl+n', (e) => { e.preventDefault(); navigate({ page: 'notes', newNote: true }); });
  useHotkeys('ctrl+p', (e) => { e.preventDefault(); navigate({ page: 'presets', newPreset: true }); });
  useHotkeys('ctrl+,', (e) => { e.preventDefault(); navigate({ page: 'settings' }); });

  useEffect(() => {
    const onNewNote = (): void => navigate({ page: 'notes', newNote: true });
    const onNewPreset = (): void => navigate({ page: 'presets', newPreset: true });
    const onOpenSettings = (): void => navigate({ page: 'settings' });
    const onDeepNote = (id: number): void => navigate({ page: 'notes', editNoteId: id });
    window.addEventListener('notes:new', onNewNote);
    window.addEventListener('presets:new', onNewPreset);
    window.addEventListener('settings:open', onOpenSettings);
    const offDeepLink = onNoteLink(onDeepNote);
    return () => {
      window.removeEventListener('notes:new', onNewNote);
      window.removeEventListener('presets:new', onNewPreset);
      window.removeEventListener('settings:open', onOpenSettings);
      offDeepLink();
    };
  }, [navigate]);

  return (
    <div className="flex h-screen w-screen flex-col bg-bg-primary text-text-primary">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          {current.page === 'notes' ? <NotesPage /> : null}
          {current.page === 'presets' ? <PresetsPage /> : null}
          {current.page === 'settings' ? <SettingsPage /> : null}
        </main>
      </div>
      <CommandPalette />
      <AiInspectorOverlay />
      <div className="sr-only">{user?.login}</div>
    </div>
  );
}

function RoutedShell(): React.JSX.Element {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="flex h-screen w-screen items-center justify-center text-text-muted">Загрузка...</div>;
  }
  if (!user) {
    return <LoginScreen />;
  }
  return <MainApp />;
}

export function App(): React.JSX.Element {
  return (
    <QueryProvider>
      <SettingsProvider>
        <AuthProvider>
          <RouterProvider>
            <TooltipProvider delayDuration={200}>
              <RoutedShell />
            </TooltipProvider>
          </RouterProvider>
        </AuthProvider>
      </SettingsProvider>
    </QueryProvider>
  );
}
