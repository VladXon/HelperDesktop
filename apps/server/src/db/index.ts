import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { config } from '../config.js';
import * as schema from './schema.js';

let _db: BetterSQLite3Database<typeof schema> | null = null;
let _raw: DatabaseType | null = null;

export function createDb(dbPath: string = config.dbPath): {
  db: BetterSQLite3Database<typeof schema>;
  raw: DatabaseType;
} {
  const raw = new Database(dbPath);
  raw.pragma('journal_mode = WAL');
  raw.pragma('foreign_keys = ON');
  raw.pragma('busy_timeout = 5000');
  raw.pragma('synchronous = NORMAL');
  const db = drizzle(raw, { schema });
  return { db, raw };
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!_db) {
    const conn = createDb();
    _db = conn.db;
    _raw = conn.raw;
  }
  return _db;
}

export function getRaw(): DatabaseType {
  if (!_raw) {
    const conn = createDb();
    _db = conn.db;
    _raw = conn.raw;
  }
  return _raw;
}

export function setDb(db: BetterSQLite3Database<typeof schema>, raw: DatabaseType): void {
  _db = db;
  _raw = raw;
}

export function resetDb(): void {
  if (_raw) {
    try {
      _raw.close();
    } catch {
      // ignore
    }
  }
  _db = null;
  _raw = null;
}

export { schema };
export type { User, Session, Note, Preset, Setting, AuditLog, LoginAttempt, TelegramLink, TelegramAction } from './schema.js';
