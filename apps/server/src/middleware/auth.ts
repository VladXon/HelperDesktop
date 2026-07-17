import { timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';
import { getDb, schema, type User } from '../db/index.js';
import { verifyToken } from '../auth/jwt.js';
import { log } from '../utils/logger.js';
import { HttpError } from './error-handler.js';

export type AuthedUser = User;

function loadUser(userId: number): AuthedUser | null {
  const row = getDb().select().from(schema.users).where(eq(schema.users.id, userId)).all()[0];
  if (!row) return null;
  return { ...row, isDev: Boolean(row.isDev) } as AuthedUser;
}

function sessionExists(token: string): boolean {
  const row = getDb()
    .select({ id: schema.sessions.id })
    .from(schema.sessions)
    .where(eq(schema.sessions.token, token))
    .all()[0];
  return Boolean(row);
}

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  try {
    const auth = req.headers.authorization;
    if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
      const token = auth.slice('Bearer '.length).trim();
      const payload = verifyToken(token);
      if (!payload) {
        log.security('auth_failed', { reason: 'bad_token', ip: req.ip });
        throw new HttpError(401, 'unauthorized', 'Invalid credentials');
      }
      if (!sessionExists(token)) {
        log.security('auth_failed', { reason: 'session_revoked', userId: payload.userId, ip: req.ip });
        throw new HttpError(401, 'unauthorized', 'Invalid credentials');
      }
      const user = loadUser(payload.userId);
      if (!user) {
        log.security('auth_failed', { reason: 'user_missing', userId: payload.userId, ip: req.ip });
        throw new HttpError(401, 'unauthorized', 'Invalid credentials');
      }
      req.user = user;
      next();
      return;
    }

    log.security('auth_failed', { reason: 'no_credentials', ip: req.ip });
    throw new HttpError(401, 'unauthorized', 'Invalid credentials');
  } catch (e) {
    next(e);
  }
}

export function requireDev(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new HttpError(401, 'unauthorized', 'Invalid credentials'));
    return;
  }
  if (!req.user.isDev) {
    log.security('dev_op_denied', { userId: req.user.id, ip: req.ip });
    next(new HttpError(403, 'forbidden', 'Dev only'));
    return;
  }
  next();
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function requireBotSecret(req: Request, _res: Response, next: NextFunction): void {
  if (!config.botSharedSecret) {
    if (config.isProd) {
      log.security('bot_secret_missing_in_prod', { ip: req.ip });
      next(new HttpError(503, 'service_unavailable', 'Bot not configured'));
      return;
    }
    next();
    return;
  }
  const provided = req.headers['x-bot-secret'];
  if (typeof provided !== 'string' || !constantTimeEqual(provided, config.botSharedSecret)) {
    log.security('bot_secret_mismatch', { ip: req.ip });
    next(new HttpError(401, 'unauthorized', 'Invalid bot secret'));
    return;
  }
  next();
}
