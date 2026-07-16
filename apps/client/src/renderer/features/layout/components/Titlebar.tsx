import * as React from 'react';
import { Minus, Square, CornersOut, X } from '@phosphor-icons/react';
import { Button } from '../../../components/ui/button';
import { useAuth } from '../../../providers/AuthProvider';
import { useRouter } from '../../../providers/RouterProvider';
import { AiInspectorToggle } from '../../ai-inspector';
import { ServerStatusBadge } from './ServerStatusBadge';
import { UserMenu } from './UserMenu';

export function Titlebar(): React.JSX.Element {
  const { navigate, openCommandPalette } = useRouter();
  const { user } = useAuth();
  const [maximized, setMaximized] = React.useState<boolean>(false);

  React.useEffect(() => {
    let mounted = true;
    void window.api.window.isMaximized().then((v) => { if (mounted) setMaximized(v); });
    const off = window.api.window.onMaximizedChanged((v) => { if (mounted) setMaximized(v); });
    return () => { mounted = false; off(); };
  }, []);

  return (
    <div className="app-drag flex h-12 items-center justify-between border-b border-border bg-bg-secondary px-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate({ page: 'notes' })}
          className="app-no-drag text-sm font-semibold text-text-primary"
        >
          HelperDesktop
        </button>
        <button
          type="button"
          onClick={openCommandPalette}
          className="app-no-drag ml-3 flex items-center gap-2 rounded-md border border-border bg-bg-primary px-3 py-1 text-xs text-text-muted hover:text-text-primary"
          title="Командная палитра (Ctrl+K)"
        >
          <span>Поиск команд...</span>
          <kbd className="rounded bg-bg-secondary px-1.5 py-0.5 text-[10px]">Ctrl K</kbd>
        </button>
      </div>
      <div className="app-no-drag flex items-center gap-3">
        {user?.isDev ? <AiInspectorToggle /> : null}
        <ServerStatusBadge onClick={() => navigate({ page: 'settings' })} />
        <UserMenu />
        <div className="flex items-center">
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
