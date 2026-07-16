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
      <div className="h-16 px-6 flex items-center justify-between border-b border-white/5 bg-transparent backdrop-blur-sm">
        <div className="flex-1 max-w-2xl">
          <div className="glass-input rounded-lg flex items-center h-10 px-4 w-full group">
            <MagnifyingGlass size={20} className="text-text-muted mr-3 group-focus-within:text-accent transition-colors shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по заметкам..."
              className="bg-transparent border-none outline-none text-body-md w-full text-text-primary placeholder:text-text-muted/40 p-0 focus:ring-0"
            />
          </div>
        </div>
        <Button onClick={() => setCreating(true)} className="gap-2 px-4 py-2 ml-4 shadow-[0_0_20px_rgba(139,92,246,0.3)]">
          <Plus size={18} /> Новая заметка
        </Button>
      </div>
      {!isLoading && filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6 md:p-8">
          <div className="glass-panel rounded-2xl p-12 flex flex-col items-center justify-center text-center max-w-md w-full relative overflow-hidden group">
            <div className="inner-edge-highlight" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-accent/10 rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
            <span className="text-6xl text-accent/40 mb-6 font-light">+</span>
            <p className="text-body-md text-text-muted opacity-70">Нет заметок. Создайте первую.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {isLoading ? <div className="text-sm text-text-muted">Загрузка...</div> : null}
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
        </div>)}
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
