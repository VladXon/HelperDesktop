import { useMutation, useQueryClient } from '@tanstack/react-query';
import { setMany } from '../api';

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation<void, Error, Record<string, unknown>>({
    mutationFn: setMany,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'all'] }),
  });
}
