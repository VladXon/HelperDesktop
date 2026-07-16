import * as React from 'react';
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import { MarkdownEditor } from './MarkdownEditor';
import { TagInput } from './TagInput';
import { ReminderPicker } from './ReminderPicker';
import { useCreateNote } from '../hooks/useCreateNote';
import { useUpdateNote } from '../hooks/useUpdateNote';
import type { Note } from '../types';

interface NoteEditDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  note: Note | null;
  onSaved: () => void;
}

export function NoteEditDialog({ open, onOpenChange, note, onSaved }: NoteEditDialogProps): React.JSX.Element {
  const [title, setTitle] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [reminderAt, setReminderAt] = useState<number | null>(null);
  const [notifyTelegram, setNotifyTelegram] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const create = useCreateNote();
  const update = useUpdateNote();

  useEffect(() => {
    if (open) {
      setError(null);
      if (note) {
        setTitle(note.title);
        setBody(note.body);
        setTags(note.tags);
        setReminderAt(note.reminderAt);
        setNotifyTelegram(note.notifyTelegram);
      } else {
        setTitle('');
        setBody('');
        setTags([]);
        setReminderAt(null);
        setNotifyTelegram(false);
      }
    }
  }, [open, note]);

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    if (title.length > 200) {
      setError('Заголовок слишком длинный');
      return;
    }
    if (body.length > 10000) {
      setError('Текст слишком длинный');
      return;
    }
    try {
      if (note) {
        await update.mutateAsync({
          id: note.id,
          input: { title, body, tags, reminderAt, notifyTelegram },
        });
      } else {
        await create.mutateAsync({ title, body, tags, reminderAt, notifyTelegram });
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      setError((e as Error).message ?? 'Ошибка сохранения');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{note ? 'Редактирование заметки' : 'Новая заметка'}</DialogTitle>
          <DialogDescription>Заполните поля и сохраните.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note-title">Заголовок</Label>
            <Input id="note-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Текст</Label>
            <MarkdownEditor value={body} onChange={setBody} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Теги</Label>
            <TagInput value={tags} onChange={setTags} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label>Напоминание</Label>
              <ReminderPicker value={reminderAt} onChange={setReminderAt} />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="notify-tg">Уведомить в Telegram</Label>
              <Switch id="notify-tg" checked={notifyTelegram} onCheckedChange={setNotifyTelegram} />
            </div>
          </div>
          {error ? <div className="text-xs text-red-400">{error}</div> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {create.isPending || update.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
