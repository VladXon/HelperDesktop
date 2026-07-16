import type { CommandDef } from '../layout';

export { NotesPage } from './components/NotesPage';
export { NoteCard } from './components/NoteCard';
export { NoteEditDialog } from './components/NoteEditDialog';
export { MarkdownView } from './components/MarkdownView';
export { MarkdownEditor } from './components/MarkdownEditor';
export { TagInput } from './components/TagInput';
export { ReminderPicker } from './components/ReminderPicker';
export { useNotes } from './hooks/useNotes';
export { useCreateNote } from './hooks/useCreateNote';
export { useUpdateNote } from './hooks/useUpdateNote';
export { useDeleteNote } from './hooks/useDeleteNote';
export { useToggleNote } from './hooks/useToggleNote';
export type { Note, NoteCreateInput, NoteUpdateInput } from './types';

export function notesCommands(close: () => void): CommandDef[] {
  return [
    {
      id: 'notes.new',
      label: 'Новая заметка',
      section: 'Notes',
      keywords: ['create', 'add', 'создать', 'новая'],
      action: () => {
        close();
        window.dispatchEvent(new CustomEvent('notes:new'));
      },
    },
  ];
}
