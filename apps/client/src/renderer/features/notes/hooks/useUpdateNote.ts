import { useMutation, useQueryClient } from '@tanstack/react-query';
import { update } from '../api';
import type { Note } from '@helper/shared';
import type { NoteUpdateInput } from '../types';

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation<Note, Error, { id: number; input: NoteUpdateInput }>({
    mutationFn: ({ id, input }) => update(id, input),
    onSuccess: (note) => {
      qc.setQueryData<Note[]>(['notes'], (prev) => (prev ?? []).map((n) => (n.id === note.id ? note : n)));
    },
  });
}
