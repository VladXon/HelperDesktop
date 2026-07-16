import type { Note } from '@helper/shared';

export type { Note };

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
