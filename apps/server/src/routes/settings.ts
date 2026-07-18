import { and, eq } from 'drizzle-orm';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { settingBatchSchema, settingSetSchema } from '@helper/shared/schemas/setting';
import { getDb, schema, type Setting } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error-handler.js';

function parseValue(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function rowToSetting(row: Setting): { key: string; value: unknown; updatedAt: string } {
  return { key: row.key, value: parseValue(row.value), updatedAt: row.updatedAt };
}

export function createSettingsRouter(): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new HttpError(401, 'unauthorized');
      const db = getDb();
      const rows = await db
        .select()
        .from(schema.settings)
        .where(eq(schema.settings.userId, req.user.id));
      const data: Record<string, unknown> = {};
      for (const r of rows) data[r.key] = parseValue(r.value);
      res.json({ data });
    } catch (e) {
      next(e);
    }
  });

  router.get('/:key', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new HttpError(401, 'unauthorized');
      const key = req.params.key ?? '';
      if (!key) throw new HttpError(400, 'bad_request', 'Invalid key');
      const db = getDb();
      const [row] = await db
        .select()
        .from(schema.settings)
        .where(and(eq(schema.settings.userId, req.user.id), eq(schema.settings.key, key)));
      if (!row) throw new HttpError(404, 'not_found');
      res.json(rowToSetting(row));
    } catch (e) {
      next(e);
    }
  });

  router.put('/:key', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new HttpError(401, 'unauthorized');
      const key = req.params.key ?? '';
      if (!key) throw new HttpError(400, 'bad_request', 'Invalid key');
      const parsed = settingSetSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, 'bad_request', 'Invalid input');
      const db = getDb();
      const now = new Date().toISOString();
      const serialized = JSON.stringify(parsed.data.value);
      const [existing] = await db
        .select()
        .from(schema.settings)
        .where(and(eq(schema.settings.userId, req.user.id), eq(schema.settings.key, key)));
      if (existing) {
        await db.update(schema.settings)
          .set({ value: serialized, updatedAt: now })
          .where(and(eq(schema.settings.userId, req.user.id), eq(schema.settings.key, key)));
      } else {
        await db.insert(schema.settings)
          .values({ userId: req.user.id, key, value: serialized, updatedAt: now });
      }
      const [row] = await db
        .select()
        .from(schema.settings)
        .where(and(eq(schema.settings.userId, req.user.id), eq(schema.settings.key, key)));
      res.json(row ? rowToSetting(row) : null);
    } catch (e) {
      next(e);
    }
  });

  router.post('/batch', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new HttpError(401, 'unauthorized');
      const parsed = settingBatchSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, 'bad_request', 'Invalid input');
      const db = getDb();
      const now = new Date().toISOString();
      await db.transaction(async (tx) => {
        for (const [key, value] of Object.entries(parsed.data.data)) {
          const serialized = JSON.stringify(value);
          const [existing] = await tx
            .select()
            .from(schema.settings)
            .where(and(eq(schema.settings.userId, req.user!.id), eq(schema.settings.key, key)));
          if (existing) {
            await tx.update(schema.settings)
              .set({ value: serialized, updatedAt: now })
              .where(and(eq(schema.settings.userId, req.user!.id), eq(schema.settings.key, key)));
          } else {
            await tx.insert(schema.settings)
              .values({ userId: req.user!.id, key, value: serialized, updatedAt: now });
          }
        }
      });
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  return router;
}
