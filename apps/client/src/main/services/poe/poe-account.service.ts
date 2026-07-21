import { safeStorage } from 'electron';
import { readJson, writeJson, encryptionAvailable } from '../../utils/safe-storage.js';
import { net } from 'electron';

const POE_SESSION_FILE = 'poe-session.json';
const POE_API_BASE = 'https://www.pathofexile.com';

export interface PoeSessionData {
  poesessid: string;
  accountName: string | null;
  validatedAt: number | null;
}

export interface PoeAccountService {
  readSession(): Promise<PoeSessionData>;
  writeSession(session: PoeSessionData): Promise<void>;
  validateSession(poesessid: string): Promise<{ valid: boolean; accountName?: string }>;
  getSession(): Promise<{ configured: boolean; valid: boolean; accountName: string | null }>;
  clearSession(): Promise<void>;
  fetchCharacters(): Promise<unknown[]>;
  fetchStashItems(league: string, tabIndex: number): Promise<unknown>;
  getSessionId(): Promise<string | null>;
}

let rateLimitGate: Promise<unknown> = Promise.resolve();
function rateLimited<T>(fn: () => Promise<T>): Promise<T> {
  const result = rateLimitGate.then(fn);
  rateLimitGate = result.then(() => new Promise((r) => setTimeout(r, 334))).catch(() => new Promise((r) => setTimeout(r, 334)));
  return result;
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

export function createPoeAccountService(): PoeAccountService {
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

  async function validateSession(poesessid: string): Promise<{ valid: boolean; accountName?: string }> {
    try {
      const data = await gggFetch<{ name?: string }>('/character-window/get-account-name', poesessid);
      if (data?.name) return { valid: true, accountName: data.name };
      return { valid: false };
    } catch {
      return { valid: false };
    }
  }

  return {
    readSession: readPoeSession,
    writeSession: writePoeSession,
    validateSession,

    async getSession(): Promise<{ configured: boolean; valid: boolean; accountName: string | null }> {
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
    },

    async clearSession(): Promise<void> {
      await writePoeSession({ poesessid: '', accountName: null, validatedAt: null });
    },

    async fetchCharacters(): Promise<unknown[]> {
      const session = await readPoeSession();
      if (!session.poesessid) throw new Error('POESESSID not configured');
      const valid = await validateSession(session.poesessid);
      if (!valid.valid) throw new Error('Session expired');
      return gggFetch<unknown[]>('/character-window/get-characters', session.poesessid);
    },

    async fetchStashItems(league: string, tabIndex: number): Promise<unknown> {
      const session = await readPoeSession();
      if (!session.poesessid) throw new Error('POESESSID not configured');
      const valid = await validateSession(session.poesessid);
      if (!valid.valid) throw new Error('Session expired');
      return gggFetch(`/character-window/get-stash-items?league=${encodeURIComponent(league)}&tabs=1&tabIndex=${tabIndex}`, session.poesessid);
    },

    async getSessionId(): Promise<string | null> {
      const session = await readPoeSession();
      return session.poesessid || null;
    },
  };
}
