import { useQuery } from '@tanstack/react-query';
import { getAll } from '../api';

export function useNotes() {
  return useQuery({
    queryKey: ['notes'],
    queryFn: getAll,
  });
}
