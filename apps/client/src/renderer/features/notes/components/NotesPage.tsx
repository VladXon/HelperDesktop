import * as React from 'react';
import { useMemo, useState } from 'react';
import { Plus, MagnifyingGlass } from '@phosphor-icons/react';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { useNotes } from '../hooks/useNotes';
import { useDeleteNote } from '../hooks/useDeleteNote';
import { useToggleNote } from '../hooks/useToggleNote';
import { NoteCard } from './NoteCard';
import { NoteEditDialog } from './NoteEditDialog';
import type { Note } from '../types';

export function NotesPage(): React.JSX.Element {
  const { data: notes = [], isLoading } = useNotes();
  const deleteNote = useDeleteNote();
  const toggleNote = useToggleNote();
  const [search, setSearch] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [creating, setCreating] = useState<boolean>(false);

  const filtered = useMemo<Note[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q) || n.tags.some((t) => t.toLowerCase().includes(q)));
  }, [notes, search]);

  const pinned = filtered.filter((n) => n.pinned && !n.completed);
  const active = filtered.filter((n) => !n.pinned && !n.completed);
  const completed = filtered.filter((n) => n.completed);

  const editing = notes.find((n) => n.id === editingId) ?? null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 border-b border-border p-4">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <MagnifyingGlass size={16} className="text-text-muted" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по заметкам..." />
        </div>
        <Button onClick={() => setCreating(true)} className="gap-2">
          <Plus size={14} /> Новая заметка
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? <div className="text-sm text-text-muted">Загрузка...</div> : null}
        {!isLoading && filtered.length === 0 ? (
          <div className="text-sm text-text-muted">Нет заметок. Создайте первую.</div>
        ) : null}
        {pinned.length > 0 ? (
          <Section title="Закреплённые">
            {pinned.map((n) => (
              <NoteCard
                key={n.id}
                note={n}
                onToggleComplete={(id) => toggleNote.mutate({ id, field: 'completed' })}
                onTogglePin={(id) => toggleNote.mutate({ id, field: 'pinned' })}
                onEdit={(id) => setEditingId(id)}
                onDelete={(id) => { if (confirm('Удалить заметку?')) deleteNote.mutate(id); }}
              />
            ))}
          </Section>
        ) : null}
        {active.length > 0 ? (
          <Section title="Активные">
            {active.map((n) => (
              <NoteCard
                key={n.id}
                note={n}
                onToggleComplete={(id) => toggleNote.mutate({ id, field: 'completed' })}
                onTogglePin={(id) => toggleNote.mutate({ id, field: 'pinned' })}
                onEdit={(id) => setEditingId(id)}
                onDelete={(id) => { if (confirm('Удалить заметку?')) deleteNote.mutate(id); }}
              />
            ))}
          </Section>
        ) : null}
        {completed.length > 0 ? (
          <Section title="Завершённые">
            {completed.map((n) => (
              <NoteCard
                key={n.id}
                note={n}
                onToggleComplete={(id) => toggleNote.mutate({ id, field: 'completed' })}
                onTogglePin={(id) => toggleNote.mutate({ id, field: 'pinned' })}
                onEdit={(id) => setEditingId(id)}
                onDelete={(id) => { if (confirm('Удалить заметку?')) deleteNote.mutate(id); }}
              />
            ))}
          </Section>
        ) : null}
      </div>
      <NoteEditDialog
        open={Boolean(editingId) || creating}
        onOpenChange={(v) => { if (!v) { setEditingId(null); setCreating(false); } }}
        note={editing}
        onSaved={() => {}}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-xs font-semibold uppercase text-text-muted">{title}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}
