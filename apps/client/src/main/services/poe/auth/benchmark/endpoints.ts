import type { EndpointDef } from './types';

/**
 * Minimal endpoint catalogue.
 * Никаких «knownWorking», «notes» — только факты.
 * Работоспособность определяется ТОЛЬКО результатами бенчмарка.
 */
export const ENDPOINTS: EndpointDef[] = [
  { name: 'get-account-name', path: '/character-window/get-account-name', method: 'GET', category: 'character-window' },
  { name: 'get-characters', path: '/character-window/get-characters', method: 'GET', category: 'character-window' },
  { name: 'get-items', path: '/character-window/get-items', method: 'GET', category: 'character-window', params: { character: '__DISCOVERY__' } },
  { name: 'get-stash-items', path: '/character-window/get-stash-items', method: 'GET', category: 'stash' },
  { name: 'get-passive-skills', path: '/character-window/get-passive-skills', method: 'GET', category: 'character-window' },
  { name: 'api-profile', path: '/api/profile', method: 'GET', category: 'profile' },
  { name: 'api-leagues', path: '/api/leagues', method: 'GET', category: 'public', params: { type: 'main' } },
  { name: 'trade-data-leagues', path: '/api/trade/data/leagues', method: 'GET', category: 'public' },
  { name: 'trade-data-items', path: '/api/trade/data/items', method: 'GET', category: 'public' },
  { name: 'trade-data-stats', path: '/api/trade/data/stats', method: 'GET', category: 'public' },
];

/**
 * Endpoints used ONLY for session validation (отличаем от общего каталога).
 * Они самые важные — именно их тестируем в первую очередь.
 */
export const SESSION_VALIDATION_ENDPOINTS: EndpointDef[] = [
  { name: 'get-account-name', path: '/character-window/get-account-name', method: 'GET', category: 'character-window' },
  { name: 'api-profile', path: '/api/profile', method: 'GET', category: 'profile' },
  { name: 'api-leagues', path: '/api/leagues', method: 'GET', category: 'public', params: { type: 'main' } },
];
