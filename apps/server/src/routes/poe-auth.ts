import { Router } from 'express';
import { getDb, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import {
  createAuthorizationUrl,
  handleCallback,
  getCharacters,
  getCharacterDetail,
  getConnectionStatus,
} from '../services/poe/oauth/poe-oauth.service.js';
import { HttpError } from '../middleware/error-handler.js';
import { log } from '../utils/logger.js';

export function createPoeOauthRouter(): Router {
  const router = Router();
  const db = getDb();

  router.get('/url', requireAuth, async (_req, res, next) => {
    try {
      const user = (_req as { user?: { id: number } }).user;
      if (!user) throw new HttpError(401, 'unauthorized', 'Authentication required');

      const { authUrl, state } = createAuthorizationUrl();

      await db.insert(schema.poeOauthStates).values({
        state,
        userId: user.id,
        csrfToken: state,
        expiresAt: Math.floor(Date.now() / 1000) + 600,
        createdAt: new Date().toISOString(),
      });

      res.json({ authUrl, state });
    } catch (err) { next(err); }
  });

  router.get('/callback', async (req, res, next) => {
    try {
      const code = req.query.code as string | undefined;
      const state = req.query.state as string | undefined;
      if (!code || !state) throw new HttpError(400, 'missing_params', 'code and state are required');

      const stateRows = await db.select().from(schema.poeOauthStates).where(eq(schema.poeOauthStates.state, state)).limit(1);
      if (stateRows.length === 0) throw new HttpError(400, 'invalid_state', 'Invalid state');

      const stateRow = stateRows[0]!;
      const { accountName } = await handleCallback(code, state, stateRow.userId);

      res.json({ connected: true, accountName });
    } catch (err) { next(err); }
  });

  router.get('/characters', requireAuth, async (req, res, next) => {
    try {
      const user = (req as { user?: { id: number } }).user;
      if (!user) throw new HttpError(401, 'unauthorized', 'Authentication required');

      const accounts = await db.select().from(schema.poeAccounts).where(eq(schema.poeAccounts.userId, user.id));
      const active = accounts[0];
      if (!active) throw new HttpError(404, 'no_account', 'No PoE account connected');

      const characters = await getCharacters(active.poeAccountId);
      res.json(characters);
    } catch (err) { next(err); }
  });

  router.get('/characters/:name', requireAuth, async (req, res, next) => {
    try {
      const user = (req as { user?: { id: number } }).user;
      if (!user) throw new HttpError(401, 'unauthorized', 'Authentication required');

      const accounts = await db.select().from(schema.poeAccounts).where(eq(schema.poeAccounts.userId, user.id));
      const active = accounts[0];
      if (!active) throw new HttpError(404, 'no_account', 'No PoE account connected');

      const detail = await getCharacterDetail(active.poeAccountId, req.params.name!);
      res.json(detail);
    } catch (err) { next(err); }
  });

  router.get('/status', requireAuth, async (req, res, next) => {
    try {
      const user = (req as { user?: { id: number } }).user;
      if (!user) throw new HttpError(401, 'unauthorized', 'Authentication required');
      const status = await getConnectionStatus(user.id);
      res.json(status);
    } catch (err) { next(err); }
  });

  return router;
}
