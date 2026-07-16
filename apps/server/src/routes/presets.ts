import { and, desc, eq } from 'drizzle-orm';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { presetCreateSchema, presetUpdateSchema } from '@helper/shared/schemas/preset';
import { getDb, schema, type Preset } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error-handler.js';

const presetTogglePinSchema = z.object({});

function parseApps(raw: string): unknown[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function rowToPreset(row: Preset): Record<string, unknown> {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    apps: parseApps(row.apps),
    pinned: Boolean(row.pinned),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function parseId(raw: string): number {
  const id = Number.parseInt(raw, 10);
  if (!Number.isFinite(id) || id <= 0) throw new HttpError(400, 'bad_request', 'Invalid id');
  return id;
}

export function createPresetsRouter(): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new HttpError(401, 'unauthorized');
      const db = getDb();
      const rows = db
        .select()
        .from(schema.presets)
        .where(eq(schema.presets.userId, req.user.id))
        .orderBy(desc(schema.presets.pinned), desc(schema.presets.createdAt))
        .all();
      res.json({ presets: rows.map(rowToPreset) });
    } catch (e) {
      next(e);
    }
  });

  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new HttpError(401, 'unauthorized');
      const parsed = presetCreateSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, 'bad_request', 'Invalid input');
      const { name, icon, apps } = parsed.data;
      const db = getDb();
      const [row] = db
        .insert(schema.presets)
        .values({ userId: req.user.id, name, icon, apps: JSON.stringify(apps) })
        .returning()
        .all();
      if (!row) throw new HttpError(500, 'internal_error');
      res.status(201).json({ preset: rowToPreset(row) });
    } catch (e) {
      next(e);
    }
  });

  router.put('/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new HttpError(401, 'unauthorized');
      const id = parseId(req.params.id ?? '');
      const parsed = presetUpdateSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, 'bad_request', 'Invalid input');
      const db = getDb();
      const existing = db
        .select()
        .from(schema.presets)
        .where(and(eq(schema.presets.id, id), eq(schema.presets.userId, req.user.id)))
        .all()[0];
      if (!existing) throw new HttpError(404, 'not_found');

      const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
      const data = parsed.data;
      if (data.name !== undefined) update.name = data.name;
      if (data.icon !== undefined) update.icon = data.icon;
      if (data.apps !== undefined) update.apps = JSON.stringify(data.apps);
      if (data.pinned !== undefined) update.pinned = data.pinned;

      db.update(schema.presets).set(update).where(eq(schema.presets.id, id)).run();
      const updated = db.select().from(schema.presets).where(eq(schema.presets.id, id)).all()[0]!;
      res.json({ preset: rowToPreset(updated) });
    } catch (e) {
      next(e);
    }
  });

  router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new HttpError(401, 'unauthorized');
      const id = parseId(req.params.id ?? '');
      const db = getDb();
      const existing = db
        .select()
        .from(schema.presets)
        .where(and(eq(schema.presets.id, id), eq(schema.presets.userId, req.user.id)))
        .all()[0];
      if (!existing) throw new HttpError(404, 'not_found');
      db.delete(schema.presets).where(eq(schema.presets.id, id)).run();
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  router.patch('/:id/toggle-pin', (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new HttpError(401, 'unauthorized');
      const id = parseId(req.params.id ?? '');
      const parsed = presetTogglePinSchema.safeParse(req.body ?? {});
      if (!parsed.success) throw new HttpError(400, 'bad_request', 'Invalid input');
      const db = getDb();
      const existing = db
        .select()
        .from(schema.presets)
        .where(and(eq(schema.presets.id, id), eq(schema.presets.userId, req.user.id)))
        .all()[0];
      if (!existing) throw new HttpError(404, 'not_found');

      const newPinned = !Boolean(existing.pinned);
      db.update(schema.presets)
        .set({ pinned: newPinned, updatedAt: new Date().toISOString() })
        .where(eq(schema.presets.id, id))
        .run();
      const updated = db.select().from(schema.presets).where(eq(schema.presets.id, id)).all()[0]!;
      res.json({ preset: rowToPreset(updated) });
    } catch (e) {
      next(e);
    }
  });

  return router;
}
