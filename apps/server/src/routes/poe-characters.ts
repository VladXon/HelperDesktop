import { Router } from 'express';
import { getDb, schema } from '../db/index.js';
import { eq, desc } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { createCharacterProvider } from '../services/poe/character.provider.js';
import { HttpError } from '../middleware/error-handler.js';

const characterProvider = createCharacterProvider();

export function createPoeCharactersRouter(): Router {
  const router = Router();
  const db = getDb();

  router.use(requireAuth);

  router.get('/', async (req, res, next) => {
    try {
      const user = (req as { user?: { id: number } }).user!;
      const accounts = await db.select().from(schema.poeAccounts).where(eq(schema.poeAccounts.userId, user.id));
      const active = accounts[0];
      if (!active) throw new HttpError(404, 'no_account', 'No PoE account connected');

      const list = await db.select({
        id: schema.poeCharacters.id,
        name: schema.poeCharacters.name,
        league: schema.poeCharacters.league,
        class: schema.poeCharacters.class,
        ascendancy: schema.poeCharacters.ascendancy,
        level: schema.poeCharacters.level,
        fetchedAt: schema.poeCharacters.fetchedAt,
      }).from(schema.poeCharacters)
        .where(eq(schema.poeCharacters.accountId, active.id))
        .orderBy(desc(schema.poeCharacters.level));

      res.json(list);
    } catch (err) { next(err); }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const ch = await characterProvider.getCharacter(Number(req.params.id));
      res.json(ch);
    } catch (err) { next(err); }
  });

  router.post('/sync', async (req, res, next) => {
    try {
      const user = (req as { user?: { id: number } }).user!;
      const accounts = await db.select().from(schema.poeAccounts).where(eq(schema.poeAccounts.userId, user.id));
      const active = accounts[0];
      if (!active) throw new HttpError(404, 'no_account', 'No PoE account connected');
      if (active.authType !== 'session') throw new HttpError(400, 'not_supported', 'Character sync requires session auth');

      const { decryptToken } = await import('@helper/poe-backend/crypto');
      const sessionId = decryptToken(active.accessTokenEncrypted);
      const list = await characterProvider.fetchAndSaveCharacters(active.id, sessionId);
      res.json(list);
    } catch (err) { next(err); }
  });

  router.post('/:id/refresh', async (req, res, next) => {
    try {
      const user = (req as { user?: { id: number } }).user!;
      const accounts = await db.select().from(schema.poeAccounts).where(eq(schema.poeAccounts.userId, user.id));
      const active = accounts[0];
      if (!active) throw new HttpError(404, 'no_account', 'No PoE account connected');
      if (active.authType !== 'session') throw new HttpError(400, 'not_supported', 'Character refresh requires session auth');

      const { decryptToken } = await import('@helper/poe-backend/crypto');
      const sessionId = decryptToken(active.accessTokenEncrypted);
      const ch = await characterProvider.refreshCharacter(Number(req.params.id), sessionId);
      res.json(ch);
    } catch (err) { next(err); }
  });

  router.get('/:id/snapshots', async (req, res, next) => {
    try {
      const snaps = await characterProvider.getSnapshots(Number(req.params.id));
      res.json(snaps);
    } catch (err) { next(err); }
  });

  return router;
}
