import { config } from '../../../config.js';
import { getDb, schema } from '../../../db/index.js';
import { eq } from 'drizzle-orm';
import { log } from '../../../utils/logger.js';
import { HttpError } from '../../../middleware/error-handler.js';
import { encryptToken, decryptToken } from '@helper/poe-backend/crypto';

const API_BASE = 'https://www.pathofexile.com';

export interface PoEAuthProvider {
  connect(userId: number, credentials: Record<string, string>): Promise<{ accountName: string }>;
  disconnect(accountId: number): Promise<void>;
  getAccount(userId: number): Promise<{ id: number; accountName: string; authType: string } | null>;
  getAccessToken(accountId: string): Promise<string>;
}

async function gggFetch<T>(path: string, poesessid: string): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'HelperDesktop/1.0',
      'Cookie': `POESESSID=${poesessid}`,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new HttpError(502, 'ggg_api_error', `GGG API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

function validateSessionId(poesessid: string): void {
  if (!poesessid || poesessid.length < 10) {
    throw new HttpError(400, 'invalid_poesessid', 'Invalid POESESSID — must be at least 10 characters');
  }
}

export function createSessionAuthProvider(): PoEAuthProvider {
  const db = getDb();

  return {
    async connect(userId: number, credentials: Record<string, string>): Promise<{ accountName: string }> {
      const poesessid = credentials.poeSessionId as string;
      validateSessionId(poesessid);

      const profile = await gggFetch<{ name?: string }>('/character-window/get-account-name', poesessid);
      if (!profile?.name) {
        throw new HttpError(400, 'invalid_poesessid', 'Could not validate POESESSID');
      }

      const encrypted = encryptToken(poesessid);
      const poeAccountId = `session-${userId}-${Date.now()}`;

      const existing = await db.select().from(schema.poeAccounts)
        .where(eq(schema.poeAccounts.userId, userId))
        .limit(1);

      if (existing.length > 0) {
        await db.update(schema.poeAccounts)
          .set({
            accountName: profile.name,
            poeAccountId,
            accessTokenEncrypted: encrypted,
            refreshTokenEncrypted: null,
            tokenExpiresAt: null,
            scopes: 'session',
            authType: 'session',
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.poeAccounts.id, existing[0]!.id));
      } else {
        await db.insert(schema.poeAccounts).values({
          userId,
          poeAccountId,
          accountName: profile.name,
          accessTokenEncrypted: encrypted,
          scopes: 'session',
          authType: 'session',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      log.info('poe_session_connected', { userId, accountName: profile.name });
      return { accountName: profile.name };
    },

    async disconnect(accountId: number): Promise<void> {
      await db.delete(schema.poeAccounts).where(eq(schema.poeAccounts.id, accountId));
    },

    async getAccount(userId: number) {
      const accounts = await db.select({
        id: schema.poeAccounts.id,
        accountName: schema.poeAccounts.accountName,
        authType: schema.poeAccounts.authType,
      }).from(schema.poeAccounts)
        .where(eq(schema.poeAccounts.userId, userId))
        .limit(1);

      if (accounts.length === 0) return null;
      const a = accounts[0]!;
      return { id: a.id, accountName: a.accountName, authType: a.authType ?? 'oauth' };
    },

    async getAccessToken(poeAccountId: string): Promise<string> {
      const accounts = await db.select().from(schema.poeAccounts)
        .where(eq(schema.poeAccounts.poeAccountId, poeAccountId))
        .limit(1);
      if (accounts.length === 0) throw new HttpError(404, 'not_found', 'PoE account not found');
      try {
        return decryptToken(accounts[0]!.accessTokenEncrypted);
      } catch {
        throw new HttpError(500, 'decrypt_failed', 'Failed to decrypt PoE session token');
      }
    },
  };
}

export function getSessionProviderCharacters(poeAccountId: string): Promise<{ characters: Array<{ name: string; league: string; class: string; level: number }> }> {
  const db = getDb();
  return (async () => {
    const accounts = await db.select().from(schema.poeAccounts)
      .where(eq(schema.poeAccounts.poeAccountId, poeAccountId))
      .limit(1);
    if (accounts.length === 0) throw new HttpError(404, 'not_found', 'PoE account not found');
    const sessionId = decryptToken(accounts[0]!.accessTokenEncrypted);
    return gggFetch('/character-window/get-characters', sessionId) as Promise<{ characters: Array<{ name: string; league: string; class: string; level: number }> }>;
  })();
}
