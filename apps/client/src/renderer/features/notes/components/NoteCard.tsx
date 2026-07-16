import * as React from 'react';
import { Check, PushPinSimple, PaperPlaneTilt, PencilSimple, Trash, Bell } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { MarkdownView } from './MarkdownView';
import type { Note } from '../types';

interface NoteCardProps {
  note: Note;
  onToggleComplete: (id: number) => void;
  onTogglePin: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

export function NoteCard({ note, onToggleComplete, onTogglePin, onEdit, onDelete }: NoteCardProps): React.JSX.Element {
  return (
    <Card className={note.completed ? 'opacity-70' : undefined}>
      <CardHeader className="flex flex-row items-start gap-2 pb-2">
        <button
          type="button"
          onClick={() => onToggleComplete(note.id)}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
            note.completed ? 'border-accent bg-accent text-bg-primary' : 'border-border'
          }`}
          title={note.completed ? 'Возобновить' : 'Завершить'}
        >
          {note.completed ? <Check size={12} weight="bold" /> : null}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className={`truncate font-medium ${note.completed ? 'line-through text-text-muted' : 'text-text-primary'}`}>
              {note.title || 'Без заголовка'}
            </div>
            {note.pinned ? <PushPinSimple size={12} weight="fill" className="text-accent shrink-0" /> : null}
            {note.notifyTelegram ? <PaperPlaneTilt size={12} weight="fill" className="text-accent shrink-0" /> : null}
            {note.reminderAt ? <Bell size={12} weight="fill" className="text-accent shrink-0" /> : null}
          </div>
          {note.body ? <MarkdownView source={note.body} truncate={200} className="mt-1" /> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => onTogglePin(note.id)} title={note.pinned ? 'Открепить' : 'Закрепить'}>
            <PushPinSimple size={14} weight={note.pinned ? 'fill' : 'regular'} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onEdit(note.id)} title="Редактировать">
            <PencilSimple size={14} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(note.id)} title="Удалить" className="hover:text-red-400">
            <Trash size={14} />
          </Button>
        </div>
      </CardHeader>
      {note.tags.length > 0 ? (
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-1">
            {note.tags.map((t) => (
              <Badge key={t} variant="outline">{t}</Badge>
            ))}
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}
