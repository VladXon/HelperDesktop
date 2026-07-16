import { useMutation, useQueryClient } from '@tanstack/react-query';
import { update } from '../api';
import type { Preset } from '@helper/shared';
import type { PresetUpdateInput } from '../types';

export function useUpdatePreset() {
  const qc = useQueryClient();
  return useMutation<Preset, Error, { id: number; input: PresetUpdateInput }>({
    mutationFn: ({ id, input }) => update(id, input),
    onSuccess: (preset) => {
      qc.setQueryData<Preset[]>(['presets'], (prev) => (prev ?? []).map((p) => (p.id === preset.id ? preset : p)));
    },
  });
}
