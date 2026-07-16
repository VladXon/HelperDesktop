import * as React from 'react';
import { useMemo, useState } from 'react';
import { Plus, MagnifyingGlass } from '@phosphor-icons/react';
import { Input } from '../../../components/ui/input';
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
      <div className="flex items-center justify-between gap-2 border-b border-border p-4">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <MagnifyingGlass size={16} className="text-text-muted" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по пресетам..." />
        </div>
        <Button onClick={() => setCreating(true)} className="gap-2">
          <Plus size={14} /> Новый пресет
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? <div className="text-sm text-text-muted">Загрузка...</div> : null}
        {!isLoading && filtered.length === 0 ? (
          <div className="text-sm text-text-muted">Нет пресетов. Создайте первый.</div>
        ) : null}
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
      <PresetEditDialog
        open={Boolean(editingId) || creating}
        onOpenChange={(v) => { if (!v) { setEditingId(null); setCreating(false); } }}
        preset={editing}
        onSaved={() => {}}
      />
    </div>
  );
}
