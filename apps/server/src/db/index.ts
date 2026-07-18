import pg from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

export { schema };
export type { User, Session, Note, Preset, Setting, AuditLog, LoginAttempt, TelegramLink, TelegramAction } from './schema.js';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://helperadmin:helper_secret_2026@localhost:5432/helperdesktop',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export { pool };

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });
export type Db = typeof db;

export function getDb(): typeof db {
  return db;
}
