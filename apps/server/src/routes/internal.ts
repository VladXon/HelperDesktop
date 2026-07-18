import { Router, type NextFunction, type Request, type Response } from 'express';
import { and, eq, inArray, sql } from 'drizzle-orm';
import {
  botLinkByCodeSchema,
  botMarkNotifiedSchema,
  botMarkReadSchema,
  botMarkReminderSentSchema,
  botQrLoginApproveSchema,
  botUnlinkByTelegramIdSchema,
} from '@helper/shared/schemas/internal';
import { createSession } from '../auth/sessions.js';
import { getDb, schema } from '../db/index.js';
import { requireBotSecret } from '../middleware/auth.js';
import { HttpError } from '../middleware/error-handler.js';
import { audit } from '../services/audit.js';

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function isExpired(expiresAt: number): boolean {
  return expiresAt <= nowSeconds();
}

export function createInternalRouter(): Router {
  const router = Router();
  router.use(requireBotSecret);

  router.post('/link-by-code', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = botLinkByCodeSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, 'bad_request', 'Invalid input');
      const { code, telegramId } = parsed.data;
      const db = getDb();

      const actions = await db
        .select()
        .from(schema.telegramActions)
        .where(
          and(
            eq(schema.telegramActions.action, 'link_code'),
            eq(schema.telegramActions.token, code),
          ),
        );
      const action = actions[0];

      if (!action) throw new HttpError(404, 'not_found', 'Code not found');
      if (isExpired(action.expiresAt)) throw new HttpError(410, 'gone', 'Code expired');
      if (action.status !== 'pending') throw new HttpError(409, 'conflict', 'Code already used');
      if (action.userId === null) throw new HttpError(400, 'bad_request', 'Code has no user');

      const userId = action.userId;
      const [existingByTg] = await db
        .select()
        .from(schema.telegramLinks)
        .where(eq(schema.telegramLinks.telegramId, telegramId));
      if (existingByTg) {
        throw new HttpError(409, 'conflict', 'Telegram account already linked to another user');
      }
      const [existingByUser] = await db
        .select()
        .from(schema.telegramLinks)
        .where(eq(schema.telegramLinks.userId, userId));
      if (existingByUser) {
        await db.delete(schema.telegramLinks)
          .where(eq(schema.telegramLinks.userId, userId));
      }

      await db.insert(schema.telegramLinks)
        .values({ userId, telegramId, linkedAt: new Date().toISOString() });

      await db.update(schema.telegramActions)
        .set({ status: 'approved', telegramId })
        .where(eq(schema.telegramActions.token, code));

      const [userRow] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
      void audit(db, { action: 'telegram_link', userId, metadata: { via: 'code' } });
      res.json({ user_id: userId, login: userRow?.login ?? '' });
    } catch (e) {
      next(e);
    }
  });

  router.get('/user-by-telegram-id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tgRaw = req.query.telegramId;
      const telegramId = typeof tgRaw === 'string' ? Number.parseInt(tgRaw, 10) : NaN;
      if (!Number.isFinite(telegramId) || telegramId <= 0) {
        throw new HttpError(400, 'bad_request', 'Invalid telegramId');
      }
      const db = getDb();
      const [link] = await db
        .select()
        .from(schema.telegramLinks)
        .where(eq(schema.telegramLinks.telegramId, telegramId));
      if (!link) throw new HttpError(404, 'not_found');
      const [userRow] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, link.userId));
      if (!userRow) throw new HttpError(404, 'not_found');
      res.json({ user_id: userRow.id, login: userRow.login, is_dev: Boolean(userRow.isDev) });
    } catch (e) {
      next(e);
    }
  });

  router.post('/qr-login-approve', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = botQrLoginApproveSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, 'bad_request', 'Invalid input');
      const { token, telegramId } = parsed.data;
      const db = getDb();

      const [action] = await db
        .select()
        .from(schema.telegramActions)
        .where(
          and(
            eq(schema.telegramActions.token, token),
            eq(schema.telegramActions.action, 'qr_login'),
          ),
        );
      if (!action) throw new HttpError(404, 'not_found', 'Token not found');
      if (isExpired(action.expiresAt)) throw new HttpError(410, 'gone', 'Token expired');
      if (action.status !== 'pending') {
        throw new HttpError(409, 'conflict', 'Token already used');
      }

      const [link] = await db
        .select()
        .from(schema.telegramLinks)
        .where(eq(schema.telegramLinks.telegramId, telegramId));
      if (!link) throw new HttpError(404, 'not_found', 'Telegram account not linked');

      const sess = await createSession(db, {
        userId: link.userId,
        deviceId: null,
        ip: 'bot',
        userAgent: 'bot/qr-login',
      });
      const expiresIn = Math.floor((new Date(sess.expiresAt).getTime() - Date.now()) / 1000);

      await db.update(schema.telegramActions)
        .set({ status: 'approved', telegramId, userId: link.userId })
        .where(eq(schema.telegramActions.token, token));

      void audit(db, { action: 'bot_login_approved', userId: link.userId, metadata: { telegramId } });
      res.json({
        session: {
          token: sess.token,
          refreshToken: sess.refreshToken,
          expiresIn,
        },
      });
    } catch (e) {
      next(e);
    }
  });

  router.post('/unlink-by-telegram-id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = botUnlinkByTelegramIdSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, 'bad_request', 'Invalid input');
      const { telegramId } = parsed.data;
      const db = getDb();
      const [link] = await db
        .select()
        .from(schema.telegramLinks)
        .where(eq(schema.telegramLinks.telegramId, telegramId));
      if (!link) {
        res.json({ ok: true });
        return;
      }
      await db.delete(schema.telegramLinks)
        .where(eq(schema.telegramLinks.telegramId, telegramId));
      void audit(db, {
        action: 'telegram_unlink',
        userId: link.userId,
        metadata: { via: 'bot' },
      });
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  router.post('/mark-reminder-sent', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = botMarkReminderSentSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, 'bad_request', 'Invalid input');
      const { ids } = parsed.data;
      const db = getDb();
      await db.update(schema.notes)
        .set({ reminderAt: null })
        .where(inArray(schema.notes.id, ids));
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  router.post('/mark-notified', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = botMarkNotifiedSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, 'bad_request', 'Invalid input');
      const { ids } = parsed.data;
      const db = getDb();
      await db.update(schema.notes)
        .set({ telegramNotified: true })
        .where(inArray(schema.notes.id, ids));
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  router.get('/pending-notifications', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getDb();
      const rows = await db
        .select({
          id: schema.notes.id,
          title: schema.notes.title,
          body: schema.notes.body,
          telegramId: schema.telegramLinks.telegramId,
        })
        .from(schema.notes)
        .innerJoin(schema.telegramLinks, eq(schema.telegramLinks.userId, schema.notes.userId))
        .where(
          and(
            eq(schema.notes.notifyTelegram, true),
            eq(schema.notes.telegramNotified, false),
          ),
        );
      res.json({ rows });
    } catch (e) {
      next(e);
    }
  });

  router.get('/pending-reminders', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getDb();
      const now = Math.floor(Date.now() / 1000);
      const rows = await db
        .select({
          id: schema.notes.id,
          title: schema.notes.title,
          body: schema.notes.body,
          telegramId: schema.telegramLinks.telegramId,
        })
        .from(schema.notes)
        .innerJoin(schema.telegramLinks, eq(schema.telegramLinks.userId, schema.notes.userId))
        .where(
          and(
            eq(schema.notes.completed, false),
            and(
              sql`reminder_at IS NOT NULL`,
              sql`reminder_at <= ${now}`,
            ),
          ),
        );
      res.json({ rows });
    } catch (e) {
      next(e);
    }
  });

  router.post('/mark-read', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = botMarkReadSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, 'bad_request', 'Invalid input');
      const { id } = parsed.data;
      const db = getDb();
      await db.update(schema.notes)
        .set({ telegramNotified: true })
        .where(eq(schema.notes.id, id));
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  return router;
}
