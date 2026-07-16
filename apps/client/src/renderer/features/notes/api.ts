import type { Note } from '@helper/shared';
import type { NoteCreateInput, NoteUpdateInput } from './types';

export async function getAll(): Promise<Note[]> {
  return window.api.notes.getAll();
}

export async function create(input: NoteCreateInput): Promise<Note> {
  return window.api.notes.create(input);
}

export async function update(id: number, input: NoteUpdateInput): Promise<Note> {
  return window.api.notes.update(id, input);
}

export async function remove(id: number): Promise<void> {
  return window.api.notes.remove(id);
}

export async function toggle(id: number, field: 'pinned' | 'completed'): Promise<Note> {
  return window.api.notes.toggle(id, field);
}
