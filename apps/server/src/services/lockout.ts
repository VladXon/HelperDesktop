import { and, desc, eq, gte, sql } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { schema } from '../db/index.js';

const FAILED_WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000;
const FAILED_THRESHOLD = 5;

export interface RecordLoginAttemptInput {
  ip: string;
  login: string;
  success: boolean;
}

export function recordLoginAttempt(
  db: BetterSQLite3Database<typeof schema>,
  input: RecordLoginAttemptInput,
): void {
  db.insert(schema.loginAttempts)
    .values({ ip: input.ip, login: input.login, success: input.success })
    .run();
}

function toSqliteNow(offsetMs: number = 0): string {
  return new Date(Date.now() + offsetMs)
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d{3}Z$/, '');
}

function recentFailedCount(
  db: BetterSQLite3Database<typeof schema>,
  ip: string,
  login: string,
): number {
  const since = toSqliteNow(-FAILED_WINDOW_MS);
  const rows = db
    .select({ c: sql<number>`count(*)` })
    .from(schema.loginAttempts)
    .where(
      and(
        eq(schema.loginAttempts.ip, ip),
        eq(schema.loginAttempts.login, login),
        eq(schema.loginAttempts.success, false),
        gte(schema.loginAttempts.createdAt, since),
      ),
    )
    .all();
  return rows[0]?.c ?? 0;
}

export function isLockedOut(
  db: BetterSQLite3Database<typeof schema>,
  ip: string,
  login: string,
): boolean {
  const failed = recentFailedCount(db, ip, login);
  if (failed < FAILED_THRESHOLD) return false;

  const lastFailed = db
    .select({ at: schema.loginAttempts.createdAt })
    .from(schema.loginAttempts)
    .where(
      and(
        eq(schema.loginAttempts.ip, ip),
        eq(schema.loginAttempts.login, login),
        eq(schema.loginAttempts.success, false),
      ),
    )
    .orderBy(desc(schema.loginAttempts.createdAt))
    .limit(1)
    .all()[0];
  if (!lastFailed) return false;

  const lastFailedMs = parseSqliteUtc(lastFailed.at);
  const diff = Date.now() - lastFailedMs;
  return diff < LOCKOUT_DURATION_MS;
}

function parseSqliteUtc(s: string): number {
  return new Date(s.replace(' ', 'T') + 'Z').getTime();
}

export function clearFailedAttempts(
  db: BetterSQLite3Database<typeof schema>,
  ip: string,
  login: string,
): void {
  db.delete(schema.loginAttempts)
    .where(
      and(
        eq(schema.loginAttempts.ip, ip),
        eq(schema.loginAttempts.login, login),
        eq(schema.loginAttempts.success, false),
      ),
    )
    .run();
}
