import { and, eq, isNull, lt } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../db/schema.js';
import { log } from '../utils/logger.js';

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
const SESSION_RETENTION_MS = 24 * 60 * 60 * 1000;
const ACTIONS_RETENTION_MS = 24 * 60 * 60 * 1000;
const ATTEMPTS_RETENTION_MS = 24 * 60 * 60 * 1000;
const AUDIT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

let timer: NodeJS.Timeout | null = null;

function isoMinus(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

function intMinus(ms: number): number {
  return Math.floor((Date.now() - ms) / 1000);
}

export function runCleanupOnce(db: BetterSQLite3Database<typeof schema>): {
  sessions: number;
  actions: number;
  attempts: number;
  audit: number;
} {
  const sessionsResult = db
    .delete(schema.sessions)
    .where(
      and(
        isNull(schema.sessions.refreshTokenUsedAt),
        lt(schema.sessions.expiresAt, isoMinus(SESSION_RETENTION_MS)),
      ),
    )
    .run();
  const actionsResult = db
    .delete(schema.telegramActions)
    .where(lt(schema.telegramActions.expiresAt, intMinus(ACTIONS_RETENTION_MS)))
    .run();
  const attemptsResult = db
    .delete(schema.loginAttempts)
    .where(lt(schema.loginAttempts.createdAt, isoMinus(ATTEMPTS_RETENTION_MS)))
    .run();
  const auditResult = db
    .delete(schema.auditLog)
    .where(lt(schema.auditLog.createdAt, isoMinus(AUDIT_RETENTION_MS)))
    .run();
  return {
    sessions: sessionsResult.changes,
    actions: actionsResult.changes,
    attempts: attemptsResult.changes,
    audit: auditResult.changes,
  };
}

export function startCleanupJob(db: BetterSQLite3Database<typeof schema>): void {
  const tick = (): void => {
    try {
      const counts = runCleanupOnce(db);
      log.info('cleanup pass', counts);
    } catch (e) {
      log.error('cleanup pass failed', { error: (e as Error).message });
    }
  };
  tick();
  timer = setInterval(tick, CLEANUP_INTERVAL_MS);
  timer.unref();
}

export function stopCleanupJob(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

void eq;
