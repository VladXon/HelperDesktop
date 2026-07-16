import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toggle } from '../api';
import type { Note } from '@helper/shared';

export function useToggleNote() {
  const qc = useQueryClient();
  return useMutation<Note, Error, { id: number; field: 'pinned' | 'completed' }>({
    mutationFn: ({ id, field }) => toggle(id, field),
    onSuccess: (note) => {
      qc.setQueryData<Note[]>(['notes'], (prev) => (prev ?? []).map((n) => (n.id === note.id ? note : n)));
    },
  });
}
