import { config } from '../../../config.js';
import { getDb, schema } from '../../../db/index.js';
import { eq } from 'drizzle-orm';
import { log } from '../../../utils/logger.js';
import { HttpError } from '../../../middleware/error-handler.js';
import { encryptToken, decryptToken } from '@helper/poe-backend/crypto';
import { createGggClient } from '../ggg-client.js';

const API_BASE = 'https://www.pathofexile.com';

export interface PoEAuthProvider {
  connect(userId: number, credentials: Record<string, string>): Promise<{ accountName: string }>;
  disconnect(accountId: number): Promise<void>;
  getAccount(userId: number): Promise<{ id: number; accountName: string; authType: string } | null>;
  getAccessToken(accountId: string): Promise<string>;
}

function validateSessionId(poesessid: string): void {
  if (!poesessid || poesessid.length < 20) {
    throw new HttpError(400, 'invalid_poesessid', 'Invalid POESESSID — must be at least 20 characters (check your browser cookies)');
  }
}

export function createSessionAuthProvider(): PoEAuthProvider {
  const db = getDb();
  const ggg = createGggClient();

  return {
    async connect(userId: number, credentials: Record<string, string>): Promise<{ accountName: string }> {
      const poesessid = credentials.poeSessionId as string;
      validateSessionId(poesessid);

      let accountName: string;
      try {
        accountName = await ggg.getAccountName(poesessid);
      } catch (err) {
        if (err instanceof HttpError && err.status === 401) throw err;
        throw new HttpError(400, 'invalid_poesessid', 'Could not validate POESESSID — check your session cookie');
      }

      const encrypted = encryptToken(poesessid);
      const poeAccountId = `session-${userId}-${Date.now()}`;

      const existing = await db.select().from(schema.poeAccounts)
        .where(eq(schema.poeAccounts.userId, userId))
        .limit(1);

      if (existing.length > 0) {
        await db.update(schema.poeAccounts)
          .set({
            accountName,
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
          accountName,
          accessTokenEncrypted: encrypted,
          scopes: 'session',
          authType: 'session',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      log.info('poe_session_connected', { userId, accountName });
      return { accountName };
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
  return (async () => {
    const db = getDb();
    const accounts = await db.select().from(schema.poeAccounts)
      .where(eq(schema.poeAccounts.poeAccountId, poeAccountId))
      .limit(1);
    if (accounts.length === 0) throw new HttpError(404, 'not_found', 'PoE account not found');
    const sessionId = decryptToken(accounts[0]!.accessTokenEncrypted);
    const ggg = createGggClient();
    return { characters: await ggg.getCharacters(sessionId) };
  })();
}
