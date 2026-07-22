import { spawn } from 'node:child_process';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { eq } from 'drizzle-orm';
import { opSchema } from '@helper/shared/schemas/dev';
import { config } from '../config.js';
import { getDb, schema } from '../db/index.js';
import { getGracefulShutdown } from '../utils/shutdown.js';
import { requireAuth, requireDev } from '../middleware/auth.js';
import { HttpError } from '../middleware/error-handler.js';
import { audit } from '../services/audit.js';
import { log } from '../utils/logger.js';

function clientIp(req: Request): string {
  return req.ip ?? 'unknown';
}

export function createDevRouter(): Router {
  const router = Router();
  router.use(requireAuth, requireDev);

  router.get('/serverinfo', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getDb();
      const usersCount = (await db.select({ id: schema.users.id }).from(schema.users)).length;
      const sessionsCount = (await db.select({ id: schema.sessions.id }).from(schema.sessions)).length;
      const notesCount = (await db.select({ id: schema.notes.id }).from(schema.notes)).length;
      const presetsCount = (await db.select({ id: schema.presets.id }).from(schema.presets)).length;
      const telegramLinksCount = (await db
        .select({ userId: schema.telegramLinks.userId })
        .from(schema.telegramLinks)).length;
      const mem = process.memoryUsage();
      res.json({
        uptime: process.uptime(),
        memory: {
          rss: mem.rss,
          heapTotal: mem.heapTotal,
          heapUsed: mem.heapUsed,
          external: mem.external,
        },
        version: config.version,
        nodeEnv: config.nodeEnv,
        users_count: usersCount,
        sessions_count: sessionsCount,
        notes_count: notesCount,
        presets_count: presetsCount,
        telegram_links_count: telegramLinksCount,
      });
    } catch (e) {
      next(e);
    }
  });

  router.post('/restart', (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!config.isProd) {
        throw new HttpError(400, 'bad_request', 'Restart only allowed in production');
      }
      if (!req.user) throw new HttpError(401, 'unauthorized');
      const db = getDb();
      void audit(db, { action: 'dev_restart', userId: req.user.id, ip: clientIp(req) });
      try {
        spawn(process.argv[0] ?? 'node', [process.argv[1] ?? ''], {
          detached: true,
          stdio: 'ignore',
        }).unref();
      } catch (e) {
        log.error('restart spawn failed', { error: (e as Error).message });
      }
      res.json({ ok: true });
      getGracefulShutdown()?.();
    } catch (e) {
      next(e);
    }
  });

  router.post('/op', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new HttpError(401, 'unauthorized');
      const parsed = opSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, 'bad_request', 'Invalid input');
      const { login } = parsed.data;
      const db = getDb();
      const [target] = await db.select().from(schema.users).where(eq(schema.users.login, login));
      if (!target) throw new HttpError(404, 'not_found', 'User not found');
      await db.update(schema.users)
        .set({ isDev: true })
        .where(eq(schema.users.id, target.id));
      void audit(db, {
        action: 'dev_op',
        userId: req.user.id,
        ip: clientIp(req),
        metadata: { target: login },
      });
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  return router;
}
