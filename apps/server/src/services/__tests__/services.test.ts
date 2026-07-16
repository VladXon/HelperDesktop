import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { audit, listAudit } from '../audit.js';
import { clearFailedAttempts, isLockedOut, recordLoginAttempt } from '../lockout.js';
import * as schema from '../../db/schema.js';

let raw: Database.Database;
let db: BetterSQLite3Database<typeof schema>;

beforeEach(() => {
  raw = new Database(':memory:');
  raw.pragma('foreign_keys = ON');
  db = drizzle(raw, { schema });
  migrate(db, { migrationsFolder: './src/db/migrations' });
});

afterEach(() => {
  raw.close();
});

describe('audit', () => {
  it('inserts an audit row with serialized metadata', async () => {
    const [u] = db
      .insert(schema.users)
      .values({ login: 'u1', password: 'scrypt:1:1:1:xx:yy' })
      .returning()
      .all();
    await audit(db, { action: 'login', userId: u!.id, ip: '127.0.0.1', metadata: { device: 'a' } });
    const rows = listAudit(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe('login');
    expect(JSON.parse(rows[0].metadata!)).toEqual({ device: 'a' });
  });

  it('inserts without metadata', async () => {
    const [u] = db
      .insert(schema.users)
      .values({ login: 'u2', password: 'scrypt:1:1:1:xx:yy' })
      .returning()
      .all();
    await audit(db, { action: 'logout', userId: u!.id });
    const rows = listAudit(db);
    expect(rows[0].metadata).toBeNull();
  });
});

describe('lockout', () => {
  it('does not lock a fresh IP+login', () => {
    expect(isLockedOut(db, '1.1.1.1', 'alice')).toBe(false);
  });

  it('locks after 5 failed attempts within 15 minutes', () => {
    for (let i = 0; i < 5; i++) {
      recordLoginAttempt(db, { ip: '1.1.1.1', login: 'alice', success: false });
    }
    expect(isLockedOut(db, '1.1.1.1', 'alice')).toBe(true);
  });

  it('does not lock on 4 failed attempts', () => {
    for (let i = 0; i < 4; i++) {
      recordLoginAttempt(db, { ip: '1.1.1.1', login: 'alice', success: false });
    }
    expect(isLockedOut(db, '1.1.1.1', 'alice')).toBe(false);
  });

  it('does not lock if there are some successful logins mixed in', () => {
    for (let i = 0; i < 4; i++) {
      recordLoginAttempt(db, { ip: '1.1.1.1', login: 'alice', success: false });
    }
    recordLoginAttempt(db, { ip: '1.1.1.1', login: 'alice', success: true });
    expect(isLockedOut(db, '1.1.1.1', 'alice')).toBe(false);
  });

  it('locks based on (ip+login) pair, not just ip', () => {
    for (let i = 0; i < 5; i++) {
      recordLoginAttempt(db, { ip: '1.1.1.1', login: 'alice', success: false });
    }
    expect(isLockedOut(db, '1.1.1.1', 'bob')).toBe(false);
  });

  it('clears failed attempts on success', () => {
    for (let i = 0; i < 3; i++) {
      recordLoginAttempt(db, { ip: '1.1.1.1', login: 'alice', success: false });
    }
    clearFailedAttempts(db, '1.1.1.1', 'alice');
    for (let i = 0; i < 4; i++) {
      recordLoginAttempt(db, { ip: '1.1.1.1', login: 'alice', success: false });
    }
    expect(isLockedOut(db, '1.1.1.1', 'alice')).toBe(false);
  });

  it('old failed attempts (>15min) do not count toward lockout', () => {
    for (let i = 0; i < 4; i++) {
      recordLoginAttempt(db, { ip: '1.1.1.1', login: 'alice', success: false });
    }
    raw
      .prepare(
        "UPDATE login_attempts SET created_at = datetime('now', '-20 minutes') WHERE ip = ? AND login = ?",
      )
      .run('1.1.1.1', 'alice');
    recordLoginAttempt(db, { ip: '1.1.1.1', login: 'alice', success: false });
    expect(isLockedOut(db, '1.1.1.1', 'alice')).toBe(false);
  });

  it('lockout expires 30 minutes after the last failed attempt', () => {
    for (let i = 0; i < 5; i++) {
      recordLoginAttempt(db, { ip: '1.1.1.1', login: 'alice', success: false });
    }
    expect(isLockedOut(db, '1.1.1.1', 'alice')).toBe(true);
    raw
      .prepare(
        "UPDATE login_attempts SET created_at = datetime('now', '-31 minutes') WHERE ip = ? AND login = ? AND success = 0",
      )
      .run('1.1.1.1', 'alice');
    expect(isLockedOut(db, '1.1.1.1', 'alice')).toBe(false);
  });
});

void eq;
