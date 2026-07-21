import { Router } from 'express';
import { getDb, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error-handler.js';
import { log } from '../utils/logger.js';

export function createPoeAccountsRouter(): Router {
  const router = Router();
  const db = getDb();

  router.use(requireAuth);

  router.get('/', async (req, res, next) => {
    try {
      const user = (req as { user?: { id: number } }).user;
      if (!user) throw new HttpError(401, 'unauthorized', 'Authentication required');

      const accounts = await db.select({
        id: schema.poeAccounts.id,
        accountName: schema.poeAccounts.accountName,
        createdAt: schema.poeAccounts.createdAt,
      }).from(schema.poeAccounts).where(eq(schema.poeAccounts.userId, user.id));

      res.json(accounts.map((a) => ({ ...a, connected: true })));
    } catch (err) { next(err); }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const user = (req as { user?: { id: number } }).user;
      if (!user) throw new HttpError(401, 'unauthorized', 'Authentication required');

      const accounts = await db.select().from(schema.poeAccounts)
        .where(eq(schema.poeAccounts.userId, user.id));

      const account = accounts.find((a) => String(a.id) === req.params.id);
      if (!account) throw new HttpError(404, 'not_found', 'Account not found');

      await db.delete(schema.poeAccounts).where(eq(schema.poeAccounts.id, account.id));

      log.info('poe_account_disconnected', { userId: user.id, accountName: account.accountName });
      res.status(204).end();
    } catch (err) { next(err); }
  });

  return router;
}
