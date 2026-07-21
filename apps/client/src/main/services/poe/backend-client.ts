import { apiFetch, getServerUrl } from '../../utils/http-client.js';

interface BuildListItem {
  id: number;
  buildHash: string;
  name: string | null;
  characterClass: string | null;
  ascendancy: string | null;
  level: number | null;
  pobUrl: string | null;
  game: string;
  overallScore: number | null;
  lastAnalyzedAt: string | null;
  createdAt: string;
}

interface BuildComparisonResult {
  builds: Array<{
    hash: string;
    name: string | null;
    class: string | null;
    overallScore: number;
    offense: number;
    defense: number;
    life: number;
    es: number;
    totalDps: number;
  }>;
  deltas: {
    offenseDelta: number;
    defenseDelta: number;
    lifeDelta: number;
    esDelta: number;
    dpsDelta: number;
  };
}

interface PoeAccountInfo {
  id: number;
  accountName: string;
  connected: boolean;
  createdAt?: string;
}

interface AuthUrlData {
  authUrl: string;
  state: string;
}

export async function saveBuild(data: {
  pobUrl: string;
  rawPobXml: string;
  buildName: string;
  characterClass: string;
  ascendancy: string | null;
  level: number;
  game: string;
  source: string;
  analysis?: unknown;
}): Promise<{ id: number; buildHash: string }> {
  return apiFetch('/api/poe/builds', { method: 'POST', body: data });
}

export async function listBuilds(): Promise<BuildListItem[]> {
  return apiFetch('/api/poe/builds');
}

export function deleteBuild(buildHash: string) {
  return apiFetch(`/api/poe/builds/${encodeURIComponent(buildHash)}`, { method: 'DELETE' });
}

export function compareBuilds(hashA: string, hashB: string) {
  return apiFetch<BuildComparisonResult>('/api/poe/builds/compare', {
    method: 'POST',
    body: { hashA, hashB },
  });
}

export function getAccounts() {
  return apiFetch<PoeAccountInfo[]>('/api/poe/accounts');
}

export function disconnectAccount(id: number) {
  return apiFetch(`/api/poe/accounts/${id}`, { method: 'DELETE' });
}

export function getAuthUrl() {
  return apiFetch<AuthUrlData>('/api/poe/auth/url');
}

export function completeOAuth(code: string, state: string) {
  return apiFetch<{ connected: boolean; accountName: string }>(`/api/poe/auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
}

export function getOAuthStatus() {
  return apiFetch<{ connected: boolean; accountName: string | null; tokenValid: boolean; expiresAt: string | null; scopes: string | null }>('/api/poe/auth/status');
}

export function fetchOAuthCharacters() {
  return apiFetch<{ characters: Array<{ name: string; league: string; class: string; level: number }> }>('/api/poe/auth/characters');
}

export function getCharacterDetail(name: string) {
  return apiFetch<Record<string, unknown>>(`/api/poe/auth/characters/${encodeURIComponent(name)}`);
}
