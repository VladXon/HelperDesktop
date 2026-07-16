import { useMutation, useQueryClient } from '@tanstack/react-query';
import { togglePin } from '../api';
import type { Preset } from '@helper/shared';

export function useTogglePin() {
  const qc = useQueryClient();
  return useMutation<Preset, Error, number>({
    mutationFn: (id) => togglePin(id),
    onSuccess: (preset) => {
      qc.setQueryData<Preset[]>(['presets'], (prev) => (prev ?? []).map((p) => (p.id === preset.id ? preset : p)));
    },
  });
}
