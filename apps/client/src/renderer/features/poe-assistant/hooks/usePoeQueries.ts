import { useQuery } from '@tanstack/react-query';
import * as api from '../api';

export function usePoeSession() {
  return useQuery({
    queryKey: ['poe', 'session'],
    queryFn: api.getSession,
    staleTime: 30_000,
  });
}

export function useLeagues() {
  return useQuery({
    queryKey: ['poe', 'leagues'],
    queryFn: api.getLeagues,
    enabled: false,
    staleTime: 5 * 60_000,
  });
}

export function useExchangeRate(league: string | null, have: string, want: string) {
  return useQuery({
    queryKey: ['poe', 'exchange-rate', league, have, want],
    queryFn: () => api.fetchExchangeRate(league!, have, want),
    enabled: false,
    staleTime: 60_000,
  });
}

export function useItemSearch(league: string | null, query: Record<string, unknown> | null) {
  return useQuery({
    queryKey: ['poe', 'item-search', league, query],
    queryFn: () => api.searchItems(league!, query!),
    enabled: false,
    staleTime: 60_000,
  });
}

export function useCharacters() {
  return useQuery({
    queryKey: ['poe', 'characters'],
    queryFn: api.fetchCharacters,
    enabled: false,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useExchangeHistory() {
  return useQuery({
    queryKey: ['poe', 'exchange-history'],
    queryFn: api.fetchExchangeHistory,
    staleTime: 10 * 60_000,
  });
}
