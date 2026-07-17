import { randomBytes } from 'node:crypto';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { config } from '../config.js';
import { getDb, schema } from '../db/index.js';
import { createSession } from '../auth/sessions.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error-handler.js';
import { audit } from '../services/audit.js';

const LINK_EXPIRES_SECONDS = 5 * 60;
const QR_EXPIRES_SECONDS = 5 * 60;
const LINK_CODE_LEN = 6;
const QR_TOKEN_BYTES = 32;
const LINK_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function clientIp(req: Request): string {
  return req.ip ?? 'unknown';
}

function generateLinkCode(): string {
  let code = '';
  const bytes = randomBytes(LINK_CODE_LEN);
  for (let i = 0; i < LINK_CODE_LEN; i += 1) {
    code += LINK_CODE_ALPHABET[bytes[i]! % LINK_CODE_ALPHABET.length];
  }
  return code;
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function isExpired(expiresAt: number): boolean {
  return expiresAt <= nowSeconds();
}

export function createTelegramRouter(): Router {
  const router = Router();

  router.get('/status', requireAuth, (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new HttpError(401, 'unauthorized');
      const db = getDb();
      const link = db
        .select()
        .from(schema.telegramLinks)
        .where(eq(schema.telegramLinks.userId, req.user.id))
        .all()[0];
      if (!link) {
        res.json({ linked: false });
        return;
      }
      res.json({ linked: true, telegramId: link.telegramId });
    } catch (e) {
      next(e);
    }
  });

  router.post('/link/code', requireAuth, (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new HttpError(401, 'unauthorized');
      const db = getDb();
      const code = generateLinkCode();
      const expiresAt = nowSeconds() + LINK_EXPIRES_SECONDS;
      db.insert(schema.telegramActions)
        .values({
          token: code,
          action: 'link_code',
          userId: req.user.id,
          telegramId: null,
          status: 'pending',
          expiresAt,
        })
        .run();
      const botUsername = config.botUsername || 'bot';
      const deepLink = `https://t.me/${botUsername}?start=link_${code}`;
      res.json({ code, deepLink, expiresIn: LINK_EXPIRES_SECONDS });
    } catch (e) {
      next(e);
    }
  });

  router.get('/link/check', requireAuth, (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new HttpError(401, 'unauthorized');
      const code = typeof req.query.code === 'string' ? req.query.code : '';
      if (!code) throw new HttpError(400, 'bad_request', 'code required');
      const db = getDb();
      const action = db
        .select()
        .from(schema.telegramActions)
        .where(
          and(
            eq(schema.telegramActions.token, code),
            eq(schema.telegramActions.action, 'link_code'),
          ),
        )
        .all()[0];
      if (!action) {
        res.json({ status: 'not_found' });
        return;
      }
      if (action.status === 'approved') {
        if (action.userId === null) {
          res.json({ status: 'pending' });
          return;
        }
        const userRow = db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, action.userId))
          .all()[0];
        res.json({ status: 'linked', login: userRow?.login ?? '' });
        return;
      }
      if (isExpired(action.expiresAt)) {
        res.json({ status: 'expired' });
        return;
      }
      res.json({ status: 'pending' });
    } catch (e) {
      next(e);
    }
  });

  router.post('/qr/login/request', (_req: Request, res: Response, next: NextFunction) => {
    try {
      const token = randomBytes(QR_TOKEN_BYTES).toString('base64url');
      const expiresAt = nowSeconds() + QR_EXPIRES_SECONDS;
      const db = getDb();
      db.insert(schema.telegramActions)
        .values({
          token,
          action: 'qr_login',
          userId: null,
          telegramId: null,
          status: 'pending',
          expiresAt,
        })
        .run();
      const botUsername = config.botUsername || 'bot';
      const deepLink = `https://t.me/${botUsername}?start=login_${token}`;
      const tgDeepLink = `tg://resolve?domain=${botUsername}&start=login_${token}`;
      res.json({ token, deepLink, tgDeepLink, expiresIn: QR_EXPIRES_SECONDS });
    } catch (e) {
      next(e);
    }
  });

  router.get('/qr/login/check', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = typeof req.query.token === 'string' ? req.query.token : '';
      if (!token) throw new HttpError(400, 'bad_request', 'token required');
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
      if (!action) {
        res.json({ status: 'not_found' });
        return;
      }
      if (action.status !== 'approved') {
        if (isExpired(action.expiresAt)) {
          res.json({ status: 'expired' });
          return;
        }
        res.json({ status: 'pending' });
        return;
      }
      if (action.userId === null) {
        res.json({ status: 'pending' });
        return;
      }
      const userRow = db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, action.userId))
        .all()[0];
      if (!userRow) {
        res.json({ status: 'pending' });
        return;
      }
      const deviceId = (req.headers['x-device-id'] as string) ?? null;
      const ip = clientIp(req);
      const userAgent = req.headers['user-agent'] ?? null;
      const sess = await createSession(db, { userId: userRow.id, deviceId, ip, userAgent });
      const expiresIn = Math.floor((new Date(sess.expiresAt).getTime() - Date.now()) / 1000);
      res.json({
        status: 'approved',
        session: {
          token: sess.token,
          refreshToken: sess.refreshToken,
          expiresIn,
          user: {
            id: userRow.id,
            login: userRow.login,
            name: userRow.name,
            email: userRow.email,
            isDev: Boolean(userRow.isDev),
            createdAt: userRow.createdAt,
          },
        },
      });
    } catch (e) {
      next(e);
    }
  });

  router.post('/unlink', requireAuth, (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new HttpError(401, 'unauthorized');
      const db = getDb();
      db.delete(schema.telegramLinks).where(eq(schema.telegramLinks.userId, req.user.id)).run();
      void audit(db, { action: 'telegram_unlink', userId: req.user.id, ip: clientIp(req) });
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  return router;
}
