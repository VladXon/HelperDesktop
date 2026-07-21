import { Router } from 'express';
import { getDb, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { config } from '../config.js';
import {
  createAuthorizationUrl,
  handleCallback,
  getCharacters as getOAuthCharacters,
  getCharacterDetail,
  getConnectionStatus,
} from '../services/poe/oauth/poe-oauth.service.js';
import { createSessionAuthProvider, getSessionProviderCharacters } from '../services/poe/oauth/poe-session-auth.service.js';
import { HttpError } from '../middleware/error-handler.js';
import { log } from '../utils/logger.js';

const sessionProvider = config.poeAuthMode === 'session' ? createSessionAuthProvider() : null;

export function createPoeOauthRouter(): Router {
  const router = Router();
  const db = getDb();

  router.get('/url', requireAuth, async (_req, res, next) => {
    try {
      if (config.poeAuthMode === 'session') {
        res.json({
          mode: 'session',
          message: 'Use POST /api/poe/session/connect with your POESESSID',
          connectEndpoint: '/api/poe/session/connect',
        });
        return;
      }

      const { authUrl, state } = createAuthorizationUrl();
      await db.insert(schema.poeOauthStates).values({
        state,
        userId: (_req as { user?: { id: number } }).user!.id,
        csrfToken: state,
        expiresAt: Math.floor(Date.now() / 1000) + 600,
        createdAt: new Date().toISOString(),
      });
      res.json({ authUrl, state, mode: 'oauth' });
    } catch (err) { next(err); }
  });

  router.get('/callback', async (req, res, next) => {
    try {
      if (config.poeAuthMode === 'session') {
        throw new HttpError(400, 'wrong_mode', 'Server is in session mode; use POST /api/poe/session/connect');
      }
      const code = req.query.code as string | undefined;
      const state = req.query.state as string | undefined;
      if (!code || !state) throw new HttpError(400, 'missing_params', 'code and state are required');
      const rows = await db.select().from(schema.poeOauthStates).where(eq(schema.poeOauthStates.state, state)).limit(1);
      if (rows.length === 0) throw new HttpError(400, 'invalid_state', 'Invalid state');
      const { accountName } = await handleCallback(code, state, rows[0]!.userId);
      res.json({ connected: true, accountName });
    } catch (err) { next(err); }
  });

  router.post('/session/connect', requireAuth, async (req, res, next) => {
    try {
      if (!sessionProvider) throw new HttpError(400, 'wrong_mode', 'Server is in OAuth mode');
      const user = (req as { user?: { id: number } }).user!;
      const poeSessionId = req.body?.poeSessionId as string | undefined;
      if (!poeSessionId) throw new HttpError(400, 'missing_poesessid', 'poeSessionId is required');
      const accountName = req.body?.accountName as string | undefined;
      const credentials: Record<string, string> = { poeSessionId };
      if (accountName) credentials.accountName = accountName;
      const result = await sessionProvider.connect(user.id, credentials);
      res.json({ connected: true, accountName: result.accountName, mode: 'session' });
    } catch (err) { next(err); }
  });

  router.get('/characters', requireAuth, async (req, res, next) => {
    try {
      const user = (req as { user?: { id: number } }).user!;
      const accounts = await db.select().from(schema.poeAccounts).where(eq(schema.poeAccounts.userId, user.id));
      const active = accounts[0];
      if (!active) throw new HttpError(404, 'no_account', 'No PoE account connected');

      if (active.authType === 'session') {
        const characters = await getSessionProviderCharacters(active.poeAccountId);
        res.json(characters);
      } else {
        const characters = await getOAuthCharacters(active.poeAccountId);
        res.json(characters);
      }
    } catch (err) { next(err); }
  });

  router.get('/characters/:name', requireAuth, async (req, res, next) => {
    try {
      const user = (req as { user?: { id: number } }).user!;
      const accounts = await db.select().from(schema.poeAccounts).where(eq(schema.poeAccounts.userId, user.id));
      const active = accounts[0];
      if (!active) throw new HttpError(404, 'no_account', 'No PoE account connected');

      const detail = await getCharacterDetail(active.poeAccountId, req.params.name!);
      res.json(detail);
    } catch (err) { next(err); }
  });

  router.get('/status', requireAuth, async (req, res, next) => {
    try {
      const user = (req as { user?: { id: number } }).user!;
      if (sessionProvider) {
        const account = await sessionProvider.getAccount(user.id);
        res.json({
          authenticated: !!account,
          account: account?.accountName ?? null,
          authType: (account?.authType as string) ?? null,
          mode: 'session' as const,
          expires: null,
        });
        return;
      }
      const status = await getConnectionStatus(user.id);
      res.json({
        authenticated: status.connected,
        account: status.accountName,
        authType: 'oauth' as const,
        mode: 'oauth' as const,
        expires: status.expiresAt,
      });
    } catch (err) { next(err); }
  });

  return router;
}
