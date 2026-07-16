import * as React from 'react';
import { ListChecks, Stack, Gear } from '@phosphor-icons/react';
import { useRouter } from '../../../providers/RouterProvider';
import { ServerStatusBadge } from './ServerStatusBadge';

interface NavItem {
  id: 'notes' | 'presets' | 'settings';
  label: string;
  Icon: typeof ListChecks;
}

const items: NavItem[] = [
  { id: 'notes', label: 'Заметки', Icon: ListChecks },
  { id: 'presets', label: 'Пресеты', Icon: Stack },
  { id: 'settings', label: 'Настройки', Icon: Gear },
];

export function Sidebar(): React.JSX.Element {
  const { current, navigate } = useRouter();

  return (
    <aside className="flex w-60 flex-col border-r border-border bg-bg-sidebar">
      <nav className="flex flex-col gap-1 p-3">
        {items.map((it) => {
          const active = current.page === it.id;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => navigate({ page: it.id } as never)}
              className={`relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                active ? 'bg-bg-secondary text-text-primary' : 'text-text-secondary hover:bg-bg-secondary/50'
              }`}
            >
              {active ? <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-gradient-to-b from-accent to-primary-container" /> : null}
              <it.Icon size={18} />
              {it.label}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto p-3 border-t border-border">
        <ServerStatusBadge onClick={() => navigate({ page: 'settings' })} />
      </div>
    </aside>
  );
}
