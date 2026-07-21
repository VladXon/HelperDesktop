import type * as React from 'react';
import { useEffect, useState } from 'react';
import { QueryProvider } from './providers/QueryProvider';
import { SettingsProvider } from './providers/SettingsProvider';
import { AuthProvider, useAuth } from './providers/AuthProvider';
import { RouterProvider, useRouter } from './providers/RouterProvider';
import { TooltipProvider } from './components/ui/tooltip';
import { ErrorBoundary } from './components/ui/error-boundary';
import { ToastProvider } from './components/ui/toast';
import { LoginScreen } from './features/auth';
import { Titlebar, Sidebar, CommandPalette } from './features/layout';
import { NotesPage } from './features/notes';
import { PresetsPage } from './features/presets';
import { SettingsPage } from './features/settings';
import { PoeAssistantPage } from './features/poe-assistant';
import { PoeAnalyzerPage } from './features/poe';
import { AiInspectorOverlay, AiInspectorProvider } from './features/ai-inspector';
import { onNoteLink } from './lib/deep-link';

function MainApp(): React.JSX.Element {
  const { current, navigate, openCommandPalette, closeCommandPalette, isCommandPaletteOpen } = useRouter();
  const { user } = useAuth();
  const [scanEnabled, setScanEnabled] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        openCommandPalette();
        return;
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        closeCommandPalette();
        return;
      }
      if (!e.ctrlKey || e.key === 'Control') return;
      switch (e.key) {
        case 'n':
          e.preventDefault();
          navigate({ page: 'notes', newNote: true });
          break;
        case 'p':
          e.preventDefault();
          navigate({ page: 'presets', newPreset: true });
          break;
        case ',':
          e.preventDefault();
          navigate({ page: 'settings' });
          break;
        case 'e':
          e.preventDefault();
          navigate({ page: 'poe-assistant' });
          break;
        case 'b':
          e.preventDefault();
          navigate({ page: 'poe-analyzer' });
          break;
        case 'F4':
          e.preventDefault();
          setScanEnabled((prev) => {
            const next = !prev;
            if (import.meta.env.DEV) {
              import('react-scan').then(({ scan }) => scan({ enabled: next }));
            }
            return next;
          });
          break;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isCommandPaletteOpen, openCommandPalette, closeCommandPalette, navigate]);

  useEffect(() => {
    const onNewNote = (): void => navigate({ page: 'notes', newNote: true });
    const onNewPreset = (): void => navigate({ page: 'presets', newPreset: true });
    const onOpenSettings = (): void => navigate({ page: 'settings' });
    const onOpenPoe = (): void => navigate({ page: 'poe-assistant' });
    const onOpenPoeAnalyzer = (): void => navigate({ page: 'poe-analyzer' });
    const onDeepNote = (id: number): void => navigate({ page: 'notes', editNoteId: id });
    window.addEventListener('notes:new', onNewNote);
    window.addEventListener('presets:new', onNewPreset);
    window.addEventListener('settings:open', onOpenSettings);
    window.addEventListener('poe-assistant:open', onOpenPoe);
    window.addEventListener('poe-analyzer:open', onOpenPoeAnalyzer);
    const offDeepLink = onNoteLink(onDeepNote);
    return () => {
      window.removeEventListener('notes:new', onNewNote);
      window.removeEventListener('presets:new', onNewPreset);
      window.removeEventListener('settings:open', onOpenSettings);
      window.removeEventListener('poe-assistant:open', onOpenPoe);
      window.removeEventListener('poe-analyzer:open', onOpenPoeAnalyzer);
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
            <ErrorBoundary>
              {current.page === 'notes' ? <NotesPage /> : null}
              {current.page === 'presets' ? <PresetsPage /> : null}
              {current.page === 'poe-assistant' ? <PoeAssistantPage /> : null}
              {current.page === 'poe-analyzer' ? <PoeAnalyzerPage /> : null}
              {current.page === 'settings' ? <SettingsPage /> : null}
            </ErrorBoundary>
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
              <ToastProvider>
                <RoutedShell />
              </ToastProvider>
            </TooltipProvider>
          </RouterProvider>
        </AuthProvider>
      </SettingsProvider>
    </QueryProvider>
  );
}
