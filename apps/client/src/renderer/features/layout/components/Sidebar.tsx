import type * as React from 'react';
import { ListChecks, Stack, Gear, CurrencyCircleDollar, PuzzlePiece } from '@phosphor-icons/react';
import { useRouter } from '../../../providers/RouterProvider';

interface NavItem {
  id: 'notes' | 'presets' | 'poe-assistant' | 'poe-analyzer' | 'settings';
  label: string;
  Icon: typeof ListChecks;
}

const items: NavItem[] = [
  { id: 'notes', label: 'Заметки', Icon: ListChecks },
  { id: 'presets', label: 'Пресеты', Icon: Stack },
  { id: 'poe-assistant', label: 'PoE', Icon: CurrencyCircleDollar },
  { id: 'poe-analyzer', label: 'Анализатор', Icon: PuzzlePiece },
  { id: 'settings', label: 'Настройки', Icon: Gear },
];

export function Sidebar(): React.JSX.Element {
  const { current, navigate } = useRouter();

  return (
    <aside className="flex w-sidebar_width flex-col border-r border-white/10 bg-surface-container-lowest/40 backdrop-blur-2xl z-40">
      <nav className="flex flex-col gap-1 px-3 py-4 mt-4">
        {items.map((it) => {
          const active = current.page === it.id;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => navigate({ page: it.id } as never)}
              className={`relative flex items-center gap-3 py-3 px-4 transition-all group ${
                active
                  ? 'bg-white/5 text-text-primary rounded-r-lg'
                  : 'text-text-muted hover:text-text-primary hover:bg-white/5 rounded-lg'
              }`}
            >
              {active ? (
                <>
                  <div className="light-pipe" />
                  <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-transparent opacity-50" />
                </>
              ) : null}
              <it.Icon size={18} className={`relative z-10 ${active ? 'text-accent' : 'group-hover:text-accent/70 transition-colors'}`} />
              <span className="font-label-sm text-sm font-medium relative z-10">{it.label}</span>
            </button>
          );
        })}
      </nav>

    </aside>
  );
}
