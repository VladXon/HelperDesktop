import { and, desc, eq, gte, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from '../db/index.js';

const FAILED_WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000;
const FAILED_THRESHOLD = 5;

export interface RecordLoginAttemptInput {
  ip: string;
  login: string;
  success: boolean;
}

export async function recordLoginAttempt(
  db: NodePgDatabase<typeof schema>,
  input: RecordLoginAttemptInput,
): Promise<void> {
  await db.insert(schema.loginAttempts)
    .values({ ip: input.ip, login: input.login, success: input.success });
}

function toPgNow(offsetMs: number = 0): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

async function recentFailedCount(
  db: NodePgDatabase<typeof schema>,
  ip: string,
  login: string,
): Promise<number> {
  const since = toPgNow(-FAILED_WINDOW_MS);
  const rows = await db
    .select({ c: sql<number>`count(*)` })
    .from(schema.loginAttempts)
    .where(
      and(
        eq(schema.loginAttempts.ip, ip),
        eq(schema.loginAttempts.login, login),
        eq(schema.loginAttempts.success, false),
        gte(schema.loginAttempts.createdAt, since),
      ),
    );
  return rows[0]?.c ?? 0;
}

export async function isLockedOut(
  db: NodePgDatabase<typeof schema>,
  ip: string,
  login: string,
): Promise<boolean> {
  const failed = await recentFailedCount(db, ip, login);
  if (failed < FAILED_THRESHOLD) return false;

  const rows = await db
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
    .limit(1);
  const lastFailed = rows[0];
  if (!lastFailed) return false;

  const lastFailedMs = new Date(lastFailed.at).getTime();
  const diff = Date.now() - lastFailedMs;
  return diff < LOCKOUT_DURATION_MS;
}

export async function clearFailedAttempts(
  db: NodePgDatabase<typeof schema>,
  ip: string,
  login: string,
): Promise<void> {
  await db.delete(schema.loginAttempts)
    .where(
      and(
        eq(schema.loginAttempts.ip, ip),
        eq(schema.loginAttempts.login, login),
        eq(schema.loginAttempts.success, false),
      ),
    );
}
