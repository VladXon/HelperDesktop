import { useQuery } from '@tanstack/react-query';
import { getAllSettings } from '../api';

export function useSettings() {
  return useQuery({ queryKey: ['settings', 'all'], queryFn: getAllSettings, staleTime: 5 * 60 * 1000 });
}
