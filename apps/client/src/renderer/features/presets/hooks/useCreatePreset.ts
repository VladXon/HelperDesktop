import { useMutation, useQueryClient } from '@tanstack/react-query';
import { save } from '../api';
import type { Preset } from '@helper/shared';
import type { PresetCreateInput } from '../types';

export function useCreatePreset() {
  const qc = useQueryClient();
  return useMutation<Preset, Error, PresetCreateInput>({
    mutationFn: save,
    onSuccess: (preset) => {
      qc.setQueryData<Preset[]>(['presets'], (prev) => [preset, ...(prev ?? [])]);
    },
  });
}
