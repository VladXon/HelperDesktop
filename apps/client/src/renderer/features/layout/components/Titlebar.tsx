import * as React from 'react';
import { Minus, Square, CornersOut, X } from '@phosphor-icons/react';
import { Button } from '../../../components/ui/button';
import { useRouter } from '../../../providers/RouterProvider';
import { AiInspectorToggle } from '../../ai-inspector';
import { ServerStatusBadge } from './ServerStatusBadge';
import { UserMenu } from './UserMenu';

export function Titlebar(): React.JSX.Element {
  const { navigate, openCommandPalette } = useRouter();
  const [maximized, setMaximized] = React.useState<boolean>(false);

  React.useEffect(() => {
    let mounted = true;
    void window.api.window.isMaximized().then((v) => { if (mounted) setMaximized(v); });
    const off = window.api.window.onMaximizedChanged((v) => { if (mounted) setMaximized(v); });
    return () => { mounted = false; off(); };
  }, []);

  return (
    <div className="app-drag flex h-14 items-center justify-between border-b border-white/10 bg-surface-container-lowest/40 backdrop-blur-2xl px-4 z-50 relative">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate({ page: 'notes' })}
          className="app-no-drag text-headline-md font-bold text-text-primary tracking-tight"
        >
          HelperDesktop
        </button>
        <button
          type="button"
          onClick={openCommandPalette}
          className="app-no-drag ml-3 flex items-center gap-2 rounded-md border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
          title="Командная палитра (Ctrl+K)"
        >
          <span>Поиск команд...</span>
          <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono-label opacity-70">Ctrl K</kbd>
        </button>
      </div>
      <div className="app-no-drag flex items-center gap-3">
        {import.meta.env.DEV ? <AiInspectorToggle /> : null}
        <ServerStatusBadge onClick={() => navigate({ page: 'settings' })} />
        <UserMenu />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => window.api.window.minimize()} title="Свернуть">
            <Minus size={16} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => window.api.window.maximizeToggle()} title={maximized ? 'Восстановить' : 'Развернуть'}>
            {maximized ? <CornersOut size={14} /> : <Square size={14} />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => window.api.window.close()} title="Закрыть">
            <X size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
