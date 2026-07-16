import { randomBytes } from 'node:crypto';
import { and, eq, isNull, lt } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { sessions, users, type Session } from '../db/schema.js';
import { log } from '../utils/logger.js';
import { signToken, tokenTtlSeconds } from './jwt.js';

const REFRESH_TOKEN_BYTES = 32;

function randomToken(bytes: number): string {
  return randomBytes(bytes).toString('base64url');
}

function expiresAtIso(): string {
  return new Date(Date.now() + tokenTtlSeconds() * 1000).toISOString();
}

export interface CreateSessionInput {
  userId: number;
  deviceId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

export interface SessionPair {
  token: string;
  refreshToken: string;
  expiresAt: string;
}

export async function createSession(
  db: BetterSQLite3Database<any>,
  input: CreateSessionInput,
): Promise<SessionPair> {
  const user = db.select({ login: users.login }).from(users).where(eq(users.id, input.userId)).all()[0];
  if (!user) throw new Error(`user ${input.userId} not found while creating session`);

  const accessToken = signToken({ userId: input.userId, login: user.login });
  const refreshToken = randomToken(REFRESH_TOKEN_BYTES);
  const expiresAt = expiresAtIso();

  db.insert(sessions)
    .values({
      userId: input.userId,
      token: accessToken,
      refreshToken,
      deviceId: input.deviceId ?? null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      expiresAt,
    })
    .run();

  return { token: accessToken, refreshToken, expiresAt };
}

export function getSessionByToken(
  db: BetterSQLite3Database<any>,
  token: string,
): Session | undefined {
  return db.select().from(sessions).where(eq(sessions.token, token)).all()[0];
}

export function revokeSession(db: BetterSQLite3Database<any>, token: string): void {
  db.delete(sessions).where(eq(sessions.token, token)).run();
}

export function revokeAllSessionsForUser(db: BetterSQLite3Database<any>, userId: number): void {
  db.delete(sessions).where(eq(sessions.userId, userId)).run();
}

export async function rotateSession(
  db: BetterSQLite3Database<any>,
  refreshToken: string,
): Promise<SessionPair | null> {
  const found = db.select().from(sessions).where(eq(sessions.refreshToken, refreshToken)).all()[0];

  if (!found) {
    return null;
  }

  if (found.refreshTokenUsedAt !== null) {
    log.security('token_reuse_detected', { userId: found.userId, sessionId: found.id });
    revokeAllSessionsForUser(db, found.userId);
    return null;
  }

  db.update(sessions)
    .set({ refreshTokenUsedAt: new Date().toISOString() })
    .where(eq(sessions.id, found.id))
    .run();

  return createSession(db, {
    userId: found.userId,
    deviceId: found.deviceId,
    ip: found.ip,
    userAgent: found.userAgent,
  });
}

export function cleanupExpiredSessions(db: BetterSQLite3Database<any>): number {
  const nowIso = new Date().toISOString();
  const before = db.select({ id: sessions.id }).from(sessions).all().length;
  db.delete(sessions)
    .where(and(isNull(sessions.refreshTokenUsedAt), lt(sessions.expiresAt, nowIso)))
    .run();
  const after = db.select({ id: sessions.id }).from(sessions).all().length;
  return before - after;
}
