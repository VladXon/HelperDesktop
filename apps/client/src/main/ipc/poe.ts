import { ipcMain, net, safeStorage } from 'electron';
import { readJson, writeJson, encryptionAvailable } from '../utils/safe-storage.js';

const POE_SESSION_FILE = 'poe-session.json';
const POE_API_BASE = 'https://www.pathofexile.com';
const MAX_LISTINGS = 20;

let rateLimitGate: Promise<unknown> = Promise.resolve();
function rateLimited<T>(fn: () => Promise<T>): Promise<T> {
  const result = rateLimitGate.then(fn);
  rateLimitGate = result.then(() => new Promise((r) => setTimeout(r, 334))).catch(() => new Promise((r) => setTimeout(r, 334)));
  return result;
}

interface PoeSessionData {
  poesessid: string;
  accountName: string | null;
  validatedAt: number | null;
}

async function readPoeSession(): Promise<PoeSessionData> {
  const data = await readJson<{ encrypted: string }>(POE_SESSION_FILE);
  if (!data?.encrypted || !encryptionAvailable()) return { poesessid: '', accountName: null, validatedAt: null };
  try {
    const buf = Buffer.from(data.encrypted, 'base64');
    const decrypted = safeStorage.decryptString(buf);
    return JSON.parse(decrypted) as PoeSessionData;
  } catch {
    return { poesessid: '', accountName: null, validatedAt: null };
  }
}

async function writePoeSession(session: PoeSessionData): Promise<void> {
  if (!encryptionAvailable()) return;
  const plain = JSON.stringify(session);
  const buf = safeStorage.encryptString(plain);
  await writeJson(POE_SESSION_FILE, { encrypted: buf.toString('base64') });
}

async function gggFetch<T>(path: string, poesessid?: string): Promise<T> {
  return rateLimited(async () => {
    const url = path.startsWith('http') ? path : `${POE_API_BASE}${path}`;
    const headers: Record<string, string> = { 'User-Agent': 'HelperDesktop/1.0' };
    if (poesessid) headers.cookie = `POESESSID=${poesessid}`;
    const res = await net.fetch(url, { headers });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`GGG API ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json() as Promise<T>;
  });
}

async function validateSession(poesessid: string): Promise<{ valid: boolean; accountName?: string }> {
  try {
    const data = await gggFetch<{ name?: string }>('/character-window/get-account-name', poesessid);
    if (data?.name) return { valid: true, accountName: data.name };
    return { valid: false };
  } catch {
    return { valid: false };
  }
}

export function registerPoeIpc(): void {
  ipcMain.handle('poe:set-session', async (_e, poesessid: string) => {
    const { valid, accountName } = await validateSession(poesessid);
    if (valid) {
      await writePoeSession({ poesessid, accountName: accountName ?? null, validatedAt: Date.now() });
      return { valid: true, accountName };
    }
    return { valid: false };
  });

  ipcMain.handle('poe:get-session', async () => {
    const session = await readPoeSession();
    if (!session.poesessid) return { configured: false, valid: false, accountName: null };
    const age = session.validatedAt ? Date.now() - session.validatedAt : Infinity;
    if (age > 60 * 60 * 1000) {
      const result = await validateSession(session.poesessid);
      if (!result.valid) {
        await writePoeSession({ poesessid: '', accountName: null, validatedAt: null });
        return { configured: false, valid: false, accountName: null };
      }
      await writePoeSession({ ...session, validatedAt: Date.now() });
      return { configured: true, valid: true, accountName: result.accountName ?? session.accountName };
    }
    return { configured: true, valid: true, accountName: session.accountName };
  });

  ipcMain.handle('poe:clear-session', async () => {
    await writePoeSession({ poesessid: '', accountName: null, validatedAt: null });
  });

  ipcMain.handle('poe:get-leagues', async () => {
    const data = await gggFetch<{ result: Array<{ id: string; text: string }> }>('/api/trade/data/leagues');
    return data.result ?? [];
  });

  ipcMain.handle('poe:fetch-exchange-rate', async (_e, league: string, have: string, want: string) => {
    const body = JSON.stringify({ exchange: { status: { option: 'online' }, have: [have], want: [want] } });
    const res = await rateLimited(() =>
      net.fetch(`${POE_API_BASE}/api/trade/exchange/${encodeURIComponent(league)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'HelperDesktop/1.0' },
        body,
      }),
    );
    if (!res.ok) throw new Error(`GGG API ${res.status}`);
    const data = (await res.json()) as { id: string; result: Record<string, unknown>; total: number };
    const listingIds = Object.keys(data.result).slice(0, MAX_LISTINGS);
    if (listingIds.length === 0) return { listings: [], total: data.total };

    const hash = listingIds.join(',');
    const detailRes = await rateLimited(() =>
      net.fetch(`${POE_API_BASE}/api/trade/fetch/${hash}?query=${data.id}`, {
        headers: { 'User-Agent': 'HelperDesktop/1.0' },
      }),
    );
    if (!detailRes.ok) throw new Error(`GGG API ${detailRes.status}`);
    const detailData = (await detailRes.json()) as { result: Record<string, unknown>[] };
    return { listings: detailData.result ?? [], total: data.total };
  });

  ipcMain.handle('poe:search-items', async (_e, league: string, query: Record<string, unknown>) => {
    const res = await rateLimited(() =>
      net.fetch(`${POE_API_BASE}/api/trade/search/${encodeURIComponent(league)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'HelperDesktop/1.0' },
        body: JSON.stringify(query),
      }),
    );
    if (!res.ok) throw new Error(`GGG API ${res.status}`);
    const data = (await res.json()) as { id: string; result: string[]; total: number };
    const ids = data.result.slice(0, MAX_LISTINGS);
    if (ids.length === 0) return { id: data.id, items: [], total: data.total };

    const hash = ids.join(',');
    const detailRes = await rateLimited(() =>
      net.fetch(`${POE_API_BASE}/api/trade/fetch/${hash}?query=${data.id}`, {
        headers: { 'User-Agent': 'HelperDesktop/1.0' },
      }),
    );
    if (!detailRes.ok) throw new Error(`GGG API ${detailRes.status}`);
    const detailData = (await detailRes.json()) as { result: unknown[] };
    return { id: data.id, items: detailData.result, total: data.total };
  });

  ipcMain.handle('poe:fetch-characters', async () => {
    const session = await readPoeSession();
    if (!session.poesessid) throw new Error('POESESSID not configured');
    const valid = await validateSession(session.poesessid);
    if (!valid.valid) throw new Error('Session expired');
    return gggFetch<unknown[]>('/character-window/get-characters', session.poesessid);
  });

  ipcMain.handle('poe:fetch-stash-items', async (_e, league: string, tabIndex: number) => {
    const session = await readPoeSession();
    if (!session.poesessid) throw new Error('POESESSID not configured');
    const valid = await validateSession(session.poesessid);
    if (!valid.valid) throw new Error('Session expired');
    return gggFetch(`/character-window/get-stash-items?league=${encodeURIComponent(league)}&tabs=1&tabIndex=${tabIndex}`, session.poesessid);
  });

  ipcMain.handle('poe:fetch-exchange-history', async () => {
    const res = await rateLimited(() =>
      net.fetch('https://web.poecdn.com/api/currency-exchange', {
        headers: { 'User-Agent': 'HelperDesktop/1.0' },
      }),
    );
    if (!res.ok) throw new Error(`GGG API ${res.status}`);
    return res.json();
  });
}
