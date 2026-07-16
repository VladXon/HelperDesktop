import { useQuery } from '@tanstack/react-query';
import { getAll } from '../api';

export function usePresets() {
  return useQuery({ queryKey: ['presets'], queryFn: getAll });
}
