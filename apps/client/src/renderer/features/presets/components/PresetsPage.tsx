import type * as React from 'react';
import { useMemo, useState } from 'react';
import { Plus, MagnifyingGlass } from '@phosphor-icons/react';
import { Button } from '../../../components/ui/button';
import { usePresets } from '../hooks/usePresets';
import { useDeletePreset } from '../hooks/useDeletePreset';
import { useTogglePin } from '../hooks/useTogglePin';
import { useLaunchPreset } from '../hooks/useLaunchPreset';
import { PresetCard } from './PresetCard';
import { PresetEditDialog } from './PresetEditDialog';
import type { Preset } from '../types';

export function PresetsPage(): React.JSX.Element {
  const { data: presets = [], isLoading } = usePresets();
  const deletePreset = useDeletePreset();
  const togglePin = useTogglePin();
  const launchPreset = useLaunchPreset();
  const [search, setSearch] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [creating, setCreating] = useState<boolean>(false);

  const filtered = useMemo<Preset[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return presets;
    return presets.filter((p) => p.name.toLowerCase().includes(q) || p.apps.some((a) => a.name.toLowerCase().includes(q)));
  }, [presets, search]);

  const pinned = filtered.filter((p) => p.pinned);
  const rest = filtered.filter((p) => !p.pinned);

  const editing = presets.find((p) => p.id === editingId) ?? null;

  return (
    <div className="flex flex-col h-full">
      <div className="h-16 px-6 flex items-center justify-between border-b border-white/5 bg-transparent backdrop-blur-sm">
        <div className="flex-1 max-w-xl relative">
          <div className="flex items-center rounded-lg bg-white/5 border border-white/10 backdrop-blur-md transition-all duration-200 focus-within:border-accent/50 focus-within:bg-white/10">
            <MagnifyingGlass size={20} className="text-text-muted absolute left-3 group-focus-within:text-accent transition-colors" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по пресетам..."
              className="w-full bg-transparent border-none py-2.5 pl-10 pr-4 text-body-md text-text-primary placeholder:text-text-muted/40 focus:ring-0 outline-none rounded-lg"
            />
          </div>
        </div>
        <Button onClick={() => setCreating(true)} className="gap-2 px-4 py-2.5 ml-auto shadow-[0_0_20px_rgba(139,92,246,0.3)]">
          <Plus size={18} /> Новый пресет
        </Button>
      </div>
      {!isLoading && filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center border-t border-white/5 p-6">
          <p className="text-body-md text-text-muted opacity-60">Нет пресетов. Создайте первый.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {isLoading ? <div className="text-sm text-text-muted">Загрузка...</div> : null}
          {pinned.length > 0 ? (
            <section className="mb-6">
              <h2 className="mb-2 text-xs font-semibold uppercase text-text-muted">Закреплённые</h2>
              <div className="flex flex-col gap-2">
                {pinned.map((p) => (
                  <PresetCard
                    key={p.id}
                    preset={p}
                    onTogglePin={(id) => togglePin.mutate(id)}
                    onLaunch={(id) => launchPreset.mutate(id)}
                    onEdit={(id) => setEditingId(id)}
                    onDelete={(id) => { if (confirm('Удалить пресет?')) deletePreset.mutate(id); }}
                  />
                ))}
              </div>
            </section>
          ) : null}
          {rest.length > 0 ? (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase text-text-muted">Все</h2>
              <div className="flex flex-col gap-2">
                {rest.map((p) => (
                  <PresetCard
                    key={p.id}
                    preset={p}
                    onTogglePin={(id) => togglePin.mutate(id)}
                    onLaunch={(id) => launchPreset.mutate(id)}
                    onEdit={(id) => setEditingId(id)}
                    onDelete={(id) => { if (confirm('Удалить пресет?')) deletePreset.mutate(id); }}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
      <PresetEditDialog
        open={Boolean(editingId) || creating}
        onOpenChange={(v) => { if (!v) { setEditingId(null); setCreating(false); } }}
        preset={editing}
        onSaved={() => {}}
      />
    </div>
  );
}
