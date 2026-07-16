import { ipcMain } from 'electron';
import type { Note } from '@helper/shared';
import { apiFetch } from '../utils/http-client.js';

export interface NoteCreateInput {
  title: string;
  body: string;
  tags: string[];
  reminderAt: number | null;
  notifyTelegram: boolean;
}

export interface NoteUpdateInput {
  title?: string;
  body?: string;
  tags?: string[];
  reminderAt?: number | null;
  notifyTelegram?: boolean;
  pinned?: boolean;
  completed?: boolean;
}

function unwrapNote(raw: { note: Note } | Note): Note {
  return 'note' in raw ? raw.note : raw;
}

export function registerNotesIpc(): void {
  ipcMain.handle('notes:get-all', async () => {
    const data = await apiFetch<{ notes: Note[] }>('/api/notes');
    return data.notes;
  });

  ipcMain.handle('notes:create', async (_e, input: NoteCreateInput) => {
    const data = await apiFetch<{ note: Note }>('/api/notes', { method: 'POST', body: input });
    return unwrapNote(data);
  });

  ipcMain.handle('notes:update', async (_e, id: number, input: NoteUpdateInput) => {
    const data = await apiFetch<{ note: Note }>(`/api/notes/${id}`, { method: 'PUT', body: input });
    return unwrapNote(data);
  });

  ipcMain.handle('notes:remove', async (_e, id: number) => {
    await apiFetch(`/api/notes/${id}`, { method: 'DELETE' });
  });

  ipcMain.handle('notes:toggle', async (_e, id: number, field: 'pinned' | 'completed') => {
    const data = await apiFetch<{ note: Note }>(`/api/notes/${id}/toggle`, { method: 'PATCH', body: { field } });
    return unwrapNote(data);
  });
}
