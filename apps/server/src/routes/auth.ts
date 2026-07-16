import { eq } from 'drizzle-orm';
import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  changeEmailSchema,
  changePasswordSchema,
  loginBodySchema,
  registerSchema,
  refreshSchema,
} from '@helper/shared/schemas/auth';
import { config } from '../config.js';
import { getDb, schema, type User } from '../db/index.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { createSession, revokeAllSessionsForUser, revokeSession, rotateSession } from '../auth/sessions.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/error-handler.js';
import { audit } from '../services/audit.js';
import { clearFailedAttempts, isLockedOut, recordLoginAttempt } from '../services/lockout.js';

const INVALID_CREDS_MSG = 'Invalid credentials';

function clientIp(req: Request): string {
  return req.ip ?? 'unknown';
}

function stripUser(u: User): Omit<User, 'password'> {
  const { password: _pw, ...rest } = u as User & { password: string };
  void _pw;
  return { ...rest, isDev: Boolean(u.isDev) } as Omit<User, 'password'>;
}

function toPublicUser(u: typeof schema.users.$inferSelect) {
  return {
    id: u.id,
    login: u.login,
    name: u.name,
    email: u.email,
    isDev: Boolean(u.isDev),
    createdAt: u.createdAt,
  };
}

export function createAuthRouter(): Router {
  const router = Router();

  router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(400, 'bad_request', 'Invalid input');
      }
      const { login, password, name } = parsed.data;
      const db = getDb();
      const existing = db.select().from(schema.users).where(eq(schema.users.login, login)).all()[0];

      if (existing) {
        if (!(await verifyPassword(password, existing.password))) {
          await audit(db, { action: 'login_failed', userId: existing.id, ip: clientIp(req) });
          recordLoginAttempt(db, { ip: clientIp(req), login, success: false });
          throw new HttpError(401, 'unauthorized', INVALID_CREDS_MSG);
        }
        await audit(db, { action: 'login', userId: existing.id, ip: clientIp(req) });
        recordLoginAttempt(db, { ip: clientIp(req), login, success: true });
        clearFailedAttempts(db, clientIp(req), login);
        res.status(200).json({ user: toPublicUser(existing) });
        return;
      }

      const hashed = await hashPassword(password);
      const [u] = db
        .insert(schema.users)
        .values({ login, password: hashed, name: name ?? '' })
        .returning()
        .all();
      if (!u) throw new HttpError(500, 'internal_error');

      await audit(db, { action: 'login', userId: u.id, ip: clientIp(req) });
      recordLoginAttempt(db, { ip: clientIp(req), login, success: true });
      res.status(201).json({ user: toPublicUser(u) });
    } catch (e) {
      next(e);
    }
  });

  router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = loginBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(400, 'bad_request', 'Invalid input');
      }
      const { login, password } = parsed.data;
      const db = getDb();
      const ip = clientIp(req);

      if (isLockedOut(db, ip, login)) {
        await audit(db, { action: 'account_locked', ip, metadata: { login } });
        throw new HttpError(429, 'too_many_requests', 'Account locked');
      }

      const u = db.select().from(schema.users).where(eq(schema.users.login, login)).all()[0];
      if (!u || !(await verifyPassword(password, u.password))) {
        await audit(db, { action: 'login_failed', userId: u?.id, ip, metadata: { login } });
        recordLoginAttempt(db, { ip, login, success: false });
        throw new HttpError(401, 'unauthorized', INVALID_CREDS_MSG);
      }

      await audit(db, { action: 'login', userId: u.id, ip });
      recordLoginAttempt(db, { ip, login, success: true });
      clearFailedAttempts(db, ip, login);
      res.json({ user: toPublicUser(u) });
    } catch (e) {
      next(e);
    }
  });

  router.post('/token', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = loginBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(400, 'bad_request', 'Invalid input');
      }
      const { login, password } = parsed.data;
      const db = getDb();
      const ip = clientIp(req);

      if (isLockedOut(db, ip, login)) {
        throw new HttpError(429, 'too_many_requests', 'Account locked');
      }

      const u = db.select().from(schema.users).where(eq(schema.users.login, login)).all()[0];
      if (!u || !(await verifyPassword(password, u.password))) {
        await audit(db, { action: 'login_failed', userId: u?.id, ip, metadata: { login } });
        recordLoginAttempt(db, { ip, login, success: false });
        throw new HttpError(401, 'unauthorized', INVALID_CREDS_MSG);
      }

      const sess = await createSession(db, {
        userId: u.id,
        deviceId: (req.headers['x-device-id'] as string) ?? null,
        ip,
        userAgent: req.headers['user-agent'] ?? null,
      });
      await audit(db, { action: 'login', userId: u.id, ip });
      recordLoginAttempt(db, { ip, login, success: true });
      clearFailedAttempts(db, ip, login);
      res.json({
        token: sess.token,
        refreshToken: sess.refreshToken,
        expiresIn: Math.floor((new Date(sess.expiresAt).getTime() - Date.now()) / 1000),
        user: toPublicUser(u),
      });
    } catch (e) {
      next(e);
    }
  });

  router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = refreshSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(400, 'bad_request', 'Invalid input');
      }
      const db = getDb();
      const found = await rotateSession(db, parsed.data.refreshToken);
      if (!found) {
        throw new HttpError(401, 'unauthorized', INVALID_CREDS_MSG);
      }
      res.json({
        token: found.token,
        refreshToken: found.refreshToken,
        expiresIn: Math.floor((new Date(found.expiresAt).getTime() - Date.now()) / 1000),
      });
    } catch (e) {
      next(e);
    }
  });

  router.post('/logout', requireAuth, (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.headers.authorization;
      if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
        const token = auth.slice('Bearer '.length).trim();
        const db = getDb();
        revokeSession(db, token);
        if (req.user) {
          void audit(db, { action: 'logout', userId: req.user.id, ip: clientIp(req) });
        }
      }
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  router.get('/me', requireAuth, (_req: Request, res: Response) => {
    if (!_req.user) throw new HttpError(401, 'unauthorized', INVALID_CREDS_MSG);
    res.json({ user: stripUser(_req.user as User) });
  });

  router.put('/email', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new HttpError(401, 'unauthorized', INVALID_CREDS_MSG);
      const parsed = changeEmailSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(400, 'bad_request', 'Invalid input');
      }
      const { email, currentPassword } = parsed.data;
      const db = getDb();
      const u = db.select().from(schema.users).where(eq(schema.users.id, req.user.id)).all()[0];
      if (!u || !(await verifyPassword(currentPassword, u.password))) {
        throw new HttpError(401, 'unauthorized', INVALID_CREDS_MSG);
      }
      db.update(schema.users).set({ email }).where(eq(schema.users.id, u.id)).run();
      await audit(db, { action: 'email_change', userId: u.id, ip: clientIp(req) });
      const updated = db.select().from(schema.users).where(eq(schema.users.id, u.id)).all()[0]!;
      res.json({ user: toPublicUser(updated) });
    } catch (e) {
      next(e);
    }
  });

  router.put('/password', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new HttpError(401, 'unauthorized', INVALID_CREDS_MSG);
      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(400, 'bad_request', 'Invalid input');
      }
      const { currentPassword, newPassword } = parsed.data;
      const db = getDb();
      const u = db.select().from(schema.users).where(eq(schema.users.id, req.user.id)).all()[0];
      if (!u || !(await verifyPassword(currentPassword, u.password))) {
        throw new HttpError(401, 'unauthorized', INVALID_CREDS_MSG);
      }
      const hashed = await hashPassword(newPassword);
      db.update(schema.users).set({ password: hashed }).where(eq(schema.users.id, u.id)).run();
      revokeAllSessionsForUser(db, u.id);
      const newSession = await createSession(db, {
        userId: u.id,
        deviceId: (req.headers['x-device-id'] as string) ?? null,
        ip: clientIp(req),
        userAgent: req.headers['user-agent'] ?? null,
      });
      await audit(db, { action: 'password_change', userId: u.id, ip: clientIp(req) });
      res.json({
        token: newSession.token,
        refreshToken: newSession.refreshToken,
        expiresIn: Math.floor((new Date(newSession.expiresAt).getTime() - Date.now()) / 1000),
      });
    } catch (e) {
      next(e);
    }
  });

  return router;
}

void config;
