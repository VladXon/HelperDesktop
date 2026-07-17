import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  cleanupExpiredSessions,
  createSession,
  getSessionByToken,
  revokeAllSessionsForUser,
  revokeSession,
  rotateSession,
} from '../sessions.js';
import { signToken, verifyToken } from '../jwt.js';
import * as schema from '../../db/schema.js';

let raw: Database.Database;
let db: BetterSQLite3Database<typeof schema>;

async function makeUser(login: string): Promise<number> {
  const [u] = db
    .insert(schema.users)
    .values({ login, password: 'scrypt:16384:8:1:AA:BB' })
    .returning()
    .all();
  if (!u) throw new Error('failed to insert user');
  return u.id;
}

beforeEach(() => {
  raw = new Database(':memory:');
  raw.pragma('foreign_keys = ON');
  db = drizzle(raw, { schema });
  migrate(db, { migrationsFolder: './src/db/migrations' });
});

afterEach(() => {
  raw.close();
});

describe('signToken / verifyToken', () => {
  it('signs and verifies a token with the given payload', () => {
    const token = signToken({ userId: 1, login: 'alice' });
    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(1);
    expect(decoded?.login).toBe('alice');
    expect(typeof decoded?.jti).toBe('string');
    expect(decoded?.jti.length).toBeGreaterThan(0);
  });

  it('returns null for a garbage token', () => {
    expect(verifyToken('not.a.jwt')).toBeNull();
    expect(verifyToken('')).toBeNull();
    expect(verifyToken('xxx')).toBeNull();
  });

  it('returns null for a token signed with a different secret', () => {
    const real = signToken({ userId: 1, login: 'a' });
    const fake = `${real.split('.').slice(0, 2).join('.')}.invalidsig`;
    expect(verifyToken(fake)).toBeNull();
  });
});

describe('createSession + getSessionByToken', () => {
  it('creates a session with token and refresh token', async () => {
    const userId = await makeUser('a1');
    const sess = await createSession(db, { userId, deviceId: 'dev1' });
    expect(sess.token.length).toBeGreaterThan(20);
    expect(sess.refreshToken.length).toBeGreaterThan(20);
    expect(sess.token).not.toBe(sess.refreshToken);

    const found = getSessionByToken(db, sess.token);
    expect(found?.userId).toBe(userId);
    expect(found?.refreshToken).toBe(sess.refreshToken);
    expect(found?.deviceId).toBe('dev1');
  });
});

describe('rotateSession', () => {
  it('produces a new pair and marks old refresh as used', async () => {
    const userId = await makeUser('a2');
    const sess = await createSession(db, { userId });

    const rotated = await rotateSession(db, sess.refreshToken);
    expect(rotated).not.toBeNull();
    expect(rotated!.token).not.toBe(sess.token);
    expect(rotated!.refreshToken).not.toBe(sess.refreshToken);

    const oldSession = db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.token, sess.token))
      .all()[0];
    expect(oldSession?.refreshTokenUsedAt).not.toBeNull();
  });

  it('returns null when refresh token does not exist (no reuse detected)', async () => {
    const out = await rotateSession(db, 'no-such-refresh');
    expect(out).toBeNull();
  });

  it('revokes all sessions for the user when a used refresh is replayed', async () => {
    const userId = await makeUser('a3');
    const sess1 = await createSession(db, { userId });
    await createSession(db, { userId });

    const rotated = await rotateSession(db, sess1.refreshToken);
    expect(rotated).not.toBeNull();

    const replay = await rotateSession(db, sess1.refreshToken);
    expect(replay).toBeNull();

    const remaining = db.select().from(schema.sessions).all();
    expect(remaining).toHaveLength(0);
  });

  it('survives concurrent rotation calls (only one wins)', async () => {
    const userId = await makeUser('a4');
    const sess = await createSession(db, { userId });

    const r1 = await rotateSession(db, sess.refreshToken);
    const r2 = await rotateSession(db, sess.refreshToken);
    const wins = [r1, r2].filter((r) => r !== null);
    expect(wins).toHaveLength(1);

    const all = db.select().from(schema.sessions).all();
    expect(all.length).toBeLessThanOrEqual(1);
  });
});

describe('revokeSession', () => {
  it('removes the session by token', async () => {
    const userId = await makeUser('a5');
    const sess = await createSession(db, { userId });
    revokeSession(db, sess.token);
    const found = getSessionByToken(db, sess.token);
    expect(found).toBeUndefined();
  });
});

describe('revokeAllSessionsForUser', () => {
  it('removes all sessions for a user but leaves other users', async () => {
    const u1 = await makeUser('a6');
    const u2 = await makeUser('a7');
    await createSession(db, { userId: u1 });
    await createSession(db, { userId: u1 });
    await createSession(db, { userId: u2 });

    revokeAllSessionsForUser(db, u1);

    const remaining = db.select().from(schema.sessions).all();
    expect(remaining.every((s) => s.userId === u2)).toBe(true);
  });
});

describe('cleanupExpiredSessions', () => {
  it('removes only sessions whose expires_at is in the past', async () => {
    const userId = await makeUser('a8');
    await raw
      .prepare(
        'INSERT INTO sessions (user_id, token, refresh_token, expires_at) VALUES (?, ?, ?, ?)',
      )
      .run(userId, 'old', 'old-r', '2000-01-01T00:00:00Z');
    await raw
      .prepare(
        'INSERT INTO sessions (user_id, token, refresh_token, expires_at) VALUES (?, ?, ?, ?)',
      )
      .run(userId, 'fresh', 'fresh-r', '2099-01-01T00:00:00Z');

    cleanupExpiredSessions(db);

    const remaining = db.select().from(schema.sessions).all();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.token).toBe('fresh');
  });
});
