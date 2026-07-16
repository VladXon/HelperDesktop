import { Router, type NextFunction, type Request, type Response } from 'express';
import { and, eq, isNull, or } from 'drizzle-orm';
import {
  botLinkByCodeSchema,
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

  router.post('/link-by-code', (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = botLinkByCodeSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, 'bad_request', 'Invalid input');
      const { code, telegramId } = parsed.data;
      const db = getDb();

      const candidates = db
        .select()
        .from(schema.telegramActions)
        .where(eq(schema.telegramActions.action, 'link_code'))
        .all();
      const action = candidates
        .filter((a) => a.token === code)
        .sort((a, b) => b.expiresAt - a.expiresAt)[0];

      if (!action) throw new HttpError(404, 'not_found', 'Code not found');
      if (isExpired(action.expiresAt)) throw new HttpError(410, 'gone', 'Code expired');
      if (action.status !== 'pending') throw new HttpError(409, 'conflict', 'Code already used');
      if (action.userId === null) throw new HttpError(400, 'bad_request', 'Code has no user');

      const userId = action.userId;
      const existingByTg = db
        .select()
        .from(schema.telegramLinks)
        .where(eq(schema.telegramLinks.telegramId, telegramId))
        .all()[0];
      if (existingByTg) {
        throw new HttpError(409, 'conflict', 'Telegram account already linked to another user');
      }
      const existingByUser = db
        .select()
        .from(schema.telegramLinks)
        .where(eq(schema.telegramLinks.userId, userId))
        .all()[0];
      if (existingByUser) {
        db.delete(schema.telegramLinks)
          .where(eq(schema.telegramLinks.userId, userId))
          .run();
      }

      db.insert(schema.telegramLinks)
        .values({ userId, telegramId, linkedAt: new Date().toISOString() })
        .run();

      db.update(schema.telegramActions)
        .set({ status: 'approved', telegramId })
        .where(eq(schema.telegramActions.token, code))
        .run();

      const userRow = db.select().from(schema.users).where(eq(schema.users.id, userId)).all()[0];
      void audit(db, { action: 'telegram_link', userId, metadata: { via: 'code' } });
      res.json({ user_id: userId, login: userRow?.login ?? '' });
    } catch (e) {
      next(e);
    }
  });

  router.get('/user-by-telegram-id', (req: Request, res: Response, next: NextFunction) => {
    try {
      const tgRaw = req.query.telegramId;
      const telegramId = typeof tgRaw === 'string' ? Number.parseInt(tgRaw, 10) : NaN;
      if (!Number.isFinite(telegramId) || telegramId <= 0) {
        throw new HttpError(400, 'bad_request', 'Invalid telegramId');
      }
      const db = getDb();
      const link = db
        .select()
        .from(schema.telegramLinks)
        .where(eq(schema.telegramLinks.telegramId, telegramId))
        .all()[0];
      if (!link) throw new HttpError(404, 'not_found');
      const userRow = db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, link.userId))
        .all()[0];
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

      const action = db
        .select()
        .from(schema.telegramActions)
        .where(
          and(
            eq(schema.telegramActions.token, token),
            eq(schema.telegramActions.action, 'qr_login'),
          ),
        )
        .all()[0];
      if (!action) throw new HttpError(404, 'not_found', 'Token not found');
      if (isExpired(action.expiresAt)) throw new HttpError(410, 'gone', 'Token expired');
      if (action.status !== 'pending') {
        throw new HttpError(409, 'conflict', 'Token already used');
      }

      const link = db
        .select()
        .from(schema.telegramLinks)
        .where(eq(schema.telegramLinks.telegramId, telegramId))
        .all()[0];
      if (!link) throw new HttpError(404, 'not_found', 'Telegram account not linked');

      const sess = await createSession(db, {
        userId: link.userId,
        deviceId: null,
        ip: 'bot',
        userAgent: 'bot/qr-login',
      });
      const expiresIn = Math.floor((new Date(sess.expiresAt).getTime() - Date.now()) / 1000);

      db.update(schema.telegramActions)
        .set({ status: 'approved', telegramId, userId: link.userId })
        .where(eq(schema.telegramActions.token, token))
        .run();

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

  router.post('/unlink-by-telegram-id', (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = botUnlinkByTelegramIdSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, 'bad_request', 'Invalid input');
      const { telegramId } = parsed.data;
      const db = getDb();
      const link = db
        .select()
        .from(schema.telegramLinks)
        .where(eq(schema.telegramLinks.telegramId, telegramId))
        .all()[0];
      if (!link) {
        res.json({ ok: true });
        return;
      }
      db.delete(schema.telegramLinks)
        .where(eq(schema.telegramLinks.telegramId, telegramId))
        .run();
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

  return router;
}

void or;
void isNull;
