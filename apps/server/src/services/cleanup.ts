import { and, isNull, lt } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
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

export async function runCleanupOnce(db: NodePgDatabase<typeof schema>): Promise<{
  sessions: number;
  actions: number;
  attempts: number;
  audit: number;
}> {
  const sessionsResult = await db
    .delete(schema.sessions)
    .where(
      and(
        isNull(schema.sessions.refreshTokenUsedAt),
        lt(schema.sessions.expiresAt, isoMinus(SESSION_RETENTION_MS)),
      ),
    );
  const actionsResult = await db
    .delete(schema.telegramActions)
    .where(lt(schema.telegramActions.expiresAt, intMinus(ACTIONS_RETENTION_MS)));
  const attemptsResult = await db
    .delete(schema.loginAttempts)
    .where(lt(schema.loginAttempts.createdAt, isoMinus(ATTEMPTS_RETENTION_MS)));
  const auditResult = await db
    .delete(schema.auditLog)
    .where(lt(schema.auditLog.createdAt, isoMinus(AUDIT_RETENTION_MS)));
  return {
    sessions: sessionsResult.rowCount ?? 0,
    actions: actionsResult.rowCount ?? 0,
    attempts: attemptsResult.rowCount ?? 0,
    audit: auditResult.rowCount ?? 0,
  };
}

export function startCleanupJob(db: NodePgDatabase<typeof schema>): void {
  const tick = async (): Promise<void> => {
    try {
      const counts = await runCleanupOnce(db);
      log.info('cleanup pass', counts);
    } catch (e) {
      log.error('cleanup pass failed', { error: (e as Error).message });
    }
  };
  tick().catch((e) => log.error('initial cleanup pass failed', { error: (e as Error).message }));
  timer = setInterval(tick, CLEANUP_INTERVAL_MS);
  timer.unref();
}

export function stopCleanupJob(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
