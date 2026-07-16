import { useMutation, useQueryClient } from '@tanstack/react-query';
import { remove } from '../api';

export function useDeletePreset() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: remove,
    onSuccess: (_void, id) => {
      qc.setQueryData<unknown>(['presets'], (prev: unknown) =>
        Array.isArray(prev) ? prev.filter((p: { id: number }) => p.id !== id) : prev,
      );
    },
  });
}
