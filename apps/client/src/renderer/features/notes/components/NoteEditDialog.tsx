import type * as React from 'react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { motion } from 'framer-motion';
import { FloppyDisk, NotePencil, Spinner } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Switch } from '../../../components/ui/switch';
import { MarkdownEditor } from './MarkdownEditor';
import { TagInput } from './TagInput';
import { ReminderPicker } from './ReminderPicker';
import { AiInspectorDevPanel } from '../../ai-inspector';
import { useCreateNote } from '../hooks/useCreateNote';
import { useUpdateNote } from '../hooks/useUpdateNote';
import type { Note } from '../types';

const DRAFT_KEY = 'note-draft';

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
  const [dirty, setDirty] = useState<boolean>(false);
  const create = useCreateNote();
  const update = useUpdateNote();
  const titleRef = useRef<HTMLInputElement>(null);

  const isPending = create.isPending || update.isPending;

  const markClean = useCallback(() => setDirty(false), []);

  useEffect(() => {
    if (open) {
      setError(null);
      const saved = !note ? localStorage.getItem(DRAFT_KEY) : null;
      if (note) {
        setTitle(note.title);
        setBody(note.body);
        setTags(note.tags);
        setReminderAt(note.reminderAt);
        setNotifyTelegram(note.notifyTelegram);
        setDirty(false);
      } else if (saved) {
        try {
          const draft = JSON.parse(saved) as { title?: string; body?: string; tags?: string[]; reminderAt?: number | null; notifyTelegram?: boolean };
          setTitle(draft.title ?? '');
          setBody(draft.body ?? '');
          setTags(draft.tags ?? []);
          setReminderAt(draft.reminderAt ?? null);
          setNotifyTelegram(draft.notifyTelegram ?? false);
        } catch {
          setTitle('');
          setBody('');
          setTags([]);
          setReminderAt(null);
          setNotifyTelegram(false);
        }
        setDirty(false);
      } else {
        setTitle('');
        setBody('');
        setTags([]);
        setReminderAt(null);
        setNotifyTelegram(false);
        setDirty(false);
      }
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [open, note]);

  useEffect(() => {
    if (open && !note) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, body, tags, reminderAt, notifyTelegram }));
    }
  }, [open, note, title, body, tags, reminderAt, notifyTelegram]);

  const hasChanges = useCallback((): boolean => {
    if (!note) return title !== '' || body !== '' || tags.length > 0 || reminderAt !== null;
    return title !== note.title || body !== note.body || tags.join(',') !== note.tags.join(',') || reminderAt !== note.reminderAt || notifyTelegram !== note.notifyTelegram;
  }, [note, title, body, tags, reminderAt, notifyTelegram]);

  useEffect(() => {
    setDirty(hasChanges());
  }, [hasChanges]);

  useEffect(() => {
    if (!open) return;
    const onBefore = (e: BeforeUnloadEvent): void => {
      if (dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', onBefore);
    return () => window.removeEventListener('beforeunload', onBefore);
  }, [open, dirty]);

  const onClose = useCallback(() => {
    if (dirty) {
      const confirmed = window.confirm('У вас есть несохранённые изменения. Закрыть?');
      if (!confirmed) return;
    }
    if (!note) localStorage.removeItem(DRAFT_KEY);
    onOpenChange(false);
  }, [dirty, note, onOpenChange]);

  const onSubmit = async (e?: React.FormEvent): Promise<void> => {
    e?.preventDefault();
    setError(null);
    if (title.length > 200) {
      setError('Заголовок слишком длинный. Максимум 200 символов.');
      return;
    }
    if (body.length > 10000) {
      setError('Текст слишком длинный. Максимум 10 000 символов.');
      return;
    }
    try {
      if (note) {
        await update.mutateAsync({ id: note.id, input: { title, body, tags, reminderAt, notifyTelegram } });
      } else {
        await create.mutateAsync({ title, body, tags, reminderAt, notifyTelegram });
        localStorage.removeItem(DRAFT_KEY);
      }
      markClean();
      onSaved();
      onOpenChange(false);
    } catch (e) {
      setError((e as Error).message ?? 'Ошибка сохранения');
    }
  };

  useHotkeys('ctrl+enter', (e) => { e.preventDefault(); void onSubmit(); }, { enableOnFormTags: true, enabled: open });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); else onOpenChange(true); }}>
      <DialogContent
        className="bg-white/[0.04] backdrop-blur-2xl border-white/10 max-w-2xl p-0 gap-0 shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden"
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          <div className="px-6 pt-6 pb-4 border-b border-white/[0.06] space-y-3">
            <div className="flex items-center gap-2">
              <NotePencil size={18} className="text-accent shrink-0" />
              <DialogTitle className="text-headline-md text-text-primary">
                {note ? 'Редактирование заметки' : 'Новая заметка'}
              </DialogTitle>
            </div>
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Заголовок"
              maxLength={200}
              className="w-full bg-white/[0.03] backdrop-blur-xl rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted/30 outline-none border border-white/[0.06] focus:border-accent/50 transition-all"
            />
          </div>

          <div className="px-6 pt-4 pb-2">
            <MarkdownEditor value={body} onChange={setBody} />
          </div>

          <div className="px-6 pb-3">
            <div className="text-xs text-text-muted mb-1.5">Теги</div>
            <TagInput value={tags} onChange={setTags} />
          </div>

          <div className="px-6 pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <ReminderPicker value={reminderAt} onChange={setReminderAt} />
              <div className="flex items-center gap-3 sm:ml-auto">
                <label htmlFor="notify-tg" className="text-label-sm text-text-secondary cursor-pointer select-none">
                  Уведомить в Telegram
                </label>
                <Switch id="notify-tg" checked={notifyTelegram} onCheckedChange={setNotifyTelegram} />
              </div>
            </div>
          </div>

          {error ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="px-6"
            >
              <div className="text-xs text-red-400 pb-2">{error}</div>
            </motion.div>
          ) : null}

          <DialogFooter className="px-6 py-4 border-t border-white/[0.06]">
            <div className="flex items-center gap-2 w-full sm:justify-end">
              <span className="text-xs text-text-muted/40 mr-auto hidden sm:inline">Ctrl+Enter — сохранить</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                Отмена
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void onSubmit()}
                disabled={isPending || (!title.trim() && !body.trim())}
                className="gap-2"
              >
                {isPending ? (
                  <>
                    <Spinner size={14} className="animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <FloppyDisk size={14} />
                    Сохранить
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </motion.div>
        <AiInspectorDevPanel />
      </DialogContent>
    </Dialog>
  );
}
