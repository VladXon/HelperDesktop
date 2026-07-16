import { useMutation, useQueryClient } from '@tanstack/react-query';
import { remove } from '../api';

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: remove,
    onSuccess: (_void, id) => {
      qc.setQueryData<unknown>(['notes'], (prev: unknown) =>
        Array.isArray(prev) ? prev.filter((n: { id: number }) => n.id !== id) : prev,
      );
    },
  });
}
