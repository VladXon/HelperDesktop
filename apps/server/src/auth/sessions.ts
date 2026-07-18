import { randomBytes } from 'node:crypto';
import { and, eq, isNull, lt } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
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
  db: NodePgDatabase<any>,
  input: CreateSessionInput,
): Promise<SessionPair> {
  const rows = await db.select({ login: users.login }).from(users).where(eq(users.id, input.userId));
  const user = rows[0];
  if (!user) throw new Error(`user ${input.userId} not found while creating session`);

  const accessToken = signToken({ userId: input.userId, login: user.login });
  const refreshToken = randomToken(REFRESH_TOKEN_BYTES);
  const expiresAt = expiresAtIso();

  await db.insert(sessions)
    .values({
      userId: input.userId,
      token: accessToken,
      refreshToken,
      deviceId: input.deviceId ?? null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      expiresAt,
    });

  return { token: accessToken, refreshToken, expiresAt };
}

export async function getSessionByToken(
  db: NodePgDatabase<any>,
  token: string,
): Promise<Session | undefined> {
  const rows = await db.select().from(sessions).where(eq(sessions.token, token));
  return rows[0];
}

export async function revokeSession(db: NodePgDatabase<any>, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.token, token));
}

export async function revokeAllSessionsForUser(db: NodePgDatabase<any>, userId: number): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function rotateSession(
  db: NodePgDatabase<any>,
  refreshToken: string,
): Promise<SessionPair | null> {
  const rows = await db.select({ id: sessions.id, userId: sessions.userId, deviceId: sessions.deviceId, ip: sessions.ip, userAgent: sessions.userAgent }).from(sessions).where(eq(sessions.refreshToken, refreshToken));
  const found = rows[0];

  if (!found) {
    return null;
  }

  const result = await db.update(sessions)
    .set({ refreshTokenUsedAt: new Date().toISOString() })
    .where(and(eq(sessions.id, found.id), isNull(sessions.refreshTokenUsedAt)));

  if ((result.rowCount ?? 0) === 0) {
    log.security('token_reuse_detected', { userId: found.userId, sessionId: found.id });
    await revokeAllSessionsForUser(db, found.userId);
    return null;
  }

  return await createSession(db, {
    userId: found.userId,
    deviceId: found.deviceId,
    ip: found.ip,
    userAgent: found.userAgent,
  });
}

export async function cleanupExpiredSessions(db: NodePgDatabase<any>): Promise<number> {
  const nowIso = new Date().toISOString();
  const allBefore = await db.select({ id: sessions.id }).from(sessions);
  const before = allBefore.length;
  await db.delete(sessions)
    .where(and(isNull(sessions.refreshTokenUsedAt), lt(sessions.expiresAt, nowIso)));
  const allAfter = await db.select({ id: sessions.id }).from(sessions);
  const after = allAfter.length;
  return before - after;
}
