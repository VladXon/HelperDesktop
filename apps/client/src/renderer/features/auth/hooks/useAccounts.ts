import { useQuery } from '@tanstack/react-query';
import { listAccounts } from '../api';
import type { AccountSummary } from '../types';

export function useAccounts() {
  return useQuery<AccountSummary[]>({
    queryKey: ['auth', 'accounts'],
    queryFn: listAccounts,
    staleTime: 30_000,
  });
}
