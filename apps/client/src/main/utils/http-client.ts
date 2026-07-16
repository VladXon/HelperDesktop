import { app } from 'electron';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { getActiveAccount, readAuthStorage, readDeviceId, writeAuthStorage } from './safe-storage.js';
import { readJson, writeJson } from './safe-storage.js';
import type { ServerUrlFile } from './types.js';

const SERVER_URL_FILE = 'server-url.json';
const DEFAULT_SERVER_URL = 'http://178.172.137.167:3001';

let cachedServerUrl: string | null = null;

function serverUrlPath(): string {
  return join(app.getPath('userData'), SERVER_URL_FILE);
}

export async function getServerUrl(): Promise<string> {
  if (cachedServerUrl) return cachedServerUrl;
  const data = await readJson<ServerUrlFile>(SERVER_URL_FILE);
  cachedServerUrl = data?.url ?? DEFAULT_SERVER_URL;
  return cachedServerUrl;
}

export async function setServerUrl(url: string): Promise<void> {
  cachedServerUrl = url;
  await writeJson(SERVER_URL_FILE, { url });
}

export class HttpError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

export interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  skipRefresh?: boolean;
  raw?: boolean;
}

async function refreshToken(refresh: string): Promise<{ token: string; refreshToken: string; expiresIn: number } | null> {
  try {
    const baseUrl = await getServerUrl();
    const res = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { token: string; refreshToken: string; expiresIn: number };
    return data;
  } catch {
    return null;
  }
}

async function saveRefreshedTokens(newToken: string, newRefresh: string): Promise<void> {
  const storage = await readAuthStorage();
  if (!storage.activeAccount) return;
  const updated = storage.accounts.map((acc) =>
    acc.login === storage.activeAccount
      ? { ...acc, accessToken: newToken, refreshToken: newRefresh }
      : acc,
  );
  await writeAuthStorage({ ...storage, accounts: updated });
}

export async function apiFetch<T>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, skipRefresh = false, raw = false } = opts;
  const baseUrl = await getServerUrl();
  const url = path.startsWith('http') ? path : `${baseUrl}${path}`;

  const headers: Record<string, string> = {};
  let access: string | null = null;
  if (auth) {
    const acc = await getActiveAccount();
    if (acc) {
      access = acc.accessToken;
      headers['authorization'] = `Bearer ${access}`;
    }
  }
  if (body !== undefined && !raw) {
    headers['content-type'] = 'application/json';
  }

  try {
    const deviceId = await readDeviceId();
    headers['x-device-id'] = deviceId;
  } catch {
    void 0;
  }

  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    init.body = raw ? (body as BodyInit) : JSON.stringify(body);
  }

  let res = await fetch(url, init);
  if (res.status === 401 && auth && !skipRefresh && access) {
    const acc = await getActiveAccount();
    if (acc) {
      const refreshed = await refreshToken(acc.refreshToken);
      if (refreshed) {
        await saveRefreshedTokens(refreshed.token, refreshed.refreshToken);
        headers['authorization'] = `Bearer ${refreshed.token}`;
        res = await fetch(url, { ...init, headers });
      } else {
        const storage = await readAuthStorage();
        if (storage.activeAccount) {
          const updated = storage.accounts.filter((a) => a.login !== storage.activeAccount);
          await writeAuthStorage({ ...storage, activeAccount: null, accounts: updated });
        }
      }
    }
  }

  if (!res.ok) {
    let parsed: unknown = null;
    try {
      parsed = await res.json();
    } catch {
      try {
        parsed = await res.text();
      } catch {
        parsed = null;
      }
    }
    throw new HttpError(res.status, parsed);
  }

  if (res.status === 204) return undefined as T;
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    return (await res.json()) as T;
  }
  return (await res.text()) as unknown as T;
}
