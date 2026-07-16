import { useMutation, useQueryClient } from '@tanstack/react-query';
import { create } from '../api';
import type { Note } from '@helper/shared';
import type { NoteCreateInput } from '../types';

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation<Note, Error, NoteCreateInput>({
    mutationFn: create,
    onSuccess: (note) => {
      qc.setQueryData<Note[]>(['notes'], (prev) => [note, ...(prev ?? [])]);
    },
  });
}
