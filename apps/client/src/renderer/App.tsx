import * as React from 'react';
import { useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { QueryProvider } from './providers/QueryProvider';
import { SettingsProvider } from './providers/SettingsProvider';
import { AuthProvider, useAuth } from './providers/AuthProvider';
import { RouterProvider, useRouter } from './providers/RouterProvider';
import { TooltipProvider } from './components/ui/tooltip';
import { ErrorBoundary } from './components/ui/error-boundary';
import { LoginScreen } from './features/auth';
import { Titlebar, Sidebar, CommandPalette } from './features/layout';
import { NotesPage } from './features/notes';
import { PresetsPage } from './features/presets';
import { SettingsPage } from './features/settings';
import { AiInspectorOverlay, AiInspectorProvider } from './features/ai-inspector';
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

  const content = (
    <div className="flex h-screen w-screen flex-col bg-bg-primary text-text-primary relative overflow-hidden">
      {/* Atmospheric Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary-container/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary-container/10 blur-[120px]" />
      </div>
      <div className="relative z-10 flex flex-col h-full w-full">
        <Titlebar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-hidden">
            {current.page === 'notes' ? <NotesPage /> : null}
            {current.page === 'presets' ? <PresetsPage /> : null}
            {current.page === 'settings' ? <SettingsPage /> : null}
          </main>
        </div>
      </div>
      <CommandPalette />
      {import.meta.env.DEV ? <ErrorBoundary><AiInspectorOverlay /></ErrorBoundary> : null}
      <div className="sr-only">{user?.login}</div>
    </div>
  );

  return import.meta.env.DEV ? <AiInspectorProvider>{content}</AiInspectorProvider> : content;
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
