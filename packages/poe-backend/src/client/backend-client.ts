import type { BuildListItem, BuildDetail, BuildComparisonResult } from '../types.js';

export interface BackendClient {
  saveBuild(data: {
    pobUrl: string;
    rawPobXml: string;
    buildName: string;
    characterClass: string;
    ascendancy: string | null;
    level: number;
    game: string;
    source: string;
    analysis?: Record<string, unknown>;
  }): Promise<{ id: number; buildHash: string }>;

  listBuilds(): Promise<BuildListItem[]>;
  getBuild(buildHash: string): Promise<BuildDetail | null>;
  deleteBuild(buildHash: string): Promise<void>;
  compareBuilds(hashA: string, hashB: string): Promise<BuildComparisonResult>;
  getCachedAnalysis(pobUrl: string): Promise<unknown | null>;

  getAccounts(): Promise<Array<{ id: number; accountName: string; connected: boolean }>>;
  disconnectAccount(id: number): Promise<void>;
  getAuthUrl(): Promise<{ authUrl: string; state: string }>;
}

export function createBackendClient(baseUrl: string, getAuthToken: () => string | null): BackendClient {
  async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
    const token = getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${baseUrl}${path}`, { ...options, headers: { ...headers, ...(options?.headers as Record<string, string> ?? {}) } });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  return {
    saveBuild(data) {
      return fetchApi('/api/poe/builds', { method: 'POST', body: JSON.stringify(data) });
    },
    listBuilds() {
      return fetchApi('/api/poe/builds');
    },
    getBuild(buildHash) {
      return fetchApi(`/api/poe/builds/${encodeURIComponent(buildHash)}`);
    },
    deleteBuild(buildHash) {
      return fetchApi(`/api/poe/builds/${encodeURIComponent(buildHash)}`, { method: 'DELETE' });
    },
    compareBuilds(hashA, hashB) {
      return fetchApi('/api/poe/builds/compare', { method: 'POST', body: JSON.stringify({ hashA, hashB }) });
    },
    getCachedAnalysis(pobUrl) {
      return fetchApi(`/api/poe/cache/${encodeURIComponent(pobUrl)}`).catch(() => null);
    },
    getAccounts() {
      return fetchApi('/api/poe/accounts');
    },
    disconnectAccount(id) {
      return fetchApi(`/api/poe/accounts/${id}`, { method: 'DELETE' });
    },
    getAuthUrl() {
      return fetchApi('/api/poe/auth/url');
    },
  };
}
