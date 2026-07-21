import pg from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';
import { log, logger } from '../utils/logger.js';

export { schema };
export type { User, Session, Note, Preset, Setting, AuditLog, LoginAttempt, TelegramLink, TelegramAction } from './schema.js';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/helperdesktop',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on('error', (err, _client) => {
  logger.error('db', 'pool error', { error: err.message, stack: err.stack ?? '' });
});

pool.on('connect', () => {
  logger.debug('db', 'connection acquired');
});

export { pool };

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema, logger: false });
export type Db = typeof db;

export function getDb(): typeof db {
  return db;
}

export async function pingDb(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      return { ok: true, latencyMs: Date.now() - start };
    } finally {
      client.release();
    }
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function closePool(): Promise<void> {
  try {
    await pool.end();
    log.info('db_pool_closed');
  } catch (err) {
    log.error('db_pool_close_error', { error: err instanceof Error ? err.message : String(err) });
  }
}
