import { and, desc, eq } from 'drizzle-orm';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { noteCreateSchema, noteToggleSchema, noteUpdateSchema } from '@helper/shared/schemas/note';
import { getDb, schema, type Note } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error-handler.js';

function parseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function rowToNote(row: Note): Record<string, unknown> {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    tags: parseTags(row.tags),
    pinned: Boolean(row.pinned),
    completed: Boolean(row.completed),
    reminderAt: row.reminderAt,
    notifyTelegram: Boolean(row.notifyTelegram),
    telegramNotified: Boolean(row.telegramNotified),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function parseId(raw: string): number {
  const id = Number.parseInt(raw, 10);
  if (!Number.isFinite(id) || id <= 0) throw new HttpError(400, 'bad_request', 'Invalid id');
  return id;
}

export function createNotesRouter(): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new HttpError(401, 'unauthorized');
      const db = getDb();
      const rows = db
        .select()
        .from(schema.notes)
        .where(eq(schema.notes.userId, req.user.id))
        .orderBy(desc(schema.notes.pinned), desc(schema.notes.createdAt))
        .all();
      res.json({ notes: rows.map(rowToNote) });
    } catch (e) {
      next(e);
    }
  });

  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new HttpError(401, 'unauthorized');
      const parsed = noteCreateSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, 'bad_request', 'Invalid input');
      const { title, body, tags, reminderAt, notifyTelegram } = parsed.data;
      const db = getDb();
      const [row] = db
        .insert(schema.notes)
        .values({
          userId: req.user.id,
          title,
          body,
          tags: JSON.stringify(tags),
          reminderAt,
          notifyTelegram,
        })
        .returning()
        .all();
      if (!row) throw new HttpError(500, 'internal_error');
      res.status(201).json({ note: rowToNote(row) });
    } catch (e) {
      next(e);
    }
  });

  router.put('/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new HttpError(401, 'unauthorized');
      const id = parseId(req.params.id ?? '');
      const parsed = noteUpdateSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, 'bad_request', 'Invalid input');
      const db = getDb();
      const existing = db
        .select()
        .from(schema.notes)
        .where(and(eq(schema.notes.id, id), eq(schema.notes.userId, req.user.id)))
        .all()[0];
      if (!existing) throw new HttpError(404, 'not_found');

      const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
      const data = parsed.data;
      if (data.title !== undefined) update.title = data.title;
      if (data.body !== undefined) update.body = data.body;
      if (data.tags !== undefined) update.tags = JSON.stringify(data.tags);
      if (data.reminderAt !== undefined) update.reminderAt = data.reminderAt;
      if (data.notifyTelegram !== undefined) update.notifyTelegram = data.notifyTelegram;
      if (data.pinned !== undefined) update.pinned = data.pinned;
      if (data.completed !== undefined) update.completed = data.completed;

      db.update(schema.notes).set(update).where(eq(schema.notes.id, id)).run();
      const updated = db.select().from(schema.notes).where(eq(schema.notes.id, id)).all()[0]!;
      res.json({ note: rowToNote(updated) });
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
        .from(schema.notes)
        .where(and(eq(schema.notes.id, id), eq(schema.notes.userId, req.user.id)))
        .all()[0];
      if (!existing) throw new HttpError(404, 'not_found');
      db.delete(schema.notes).where(eq(schema.notes.id, id)).run();
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  router.patch('/:id/toggle', (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new HttpError(401, 'unauthorized');
      const id = parseId(req.params.id ?? '');
      const parsed = noteToggleSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, 'bad_request', 'Invalid input');
      const db = getDb();
      const existing = db
        .select()
        .from(schema.notes)
        .where(and(eq(schema.notes.id, id), eq(schema.notes.userId, req.user.id)))
        .all()[0];
      if (!existing) throw new HttpError(404, 'not_found');

      const current = Boolean(existing[parsed.data.field]);
      db.update(schema.notes)
        .set({ [parsed.data.field]: !current, updatedAt: new Date().toISOString() })
        .where(eq(schema.notes.id, id))
        .run();
      const updated = db.select().from(schema.notes).where(eq(schema.notes.id, id)).all()[0]!;
      res.json({ note: rowToNote(updated) });
    } catch (e) {
      next(e);
    }
  });

  return router;
}
