import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as schema from '../db/schema.js';

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

describe('Drizzle schema migrations', () => {
  it('creates all 9 tables', () => {
    const tables = raw
      .prepare<unknown[], { name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name <> '__drizzle_migrations'",
      )
      .all();
    const names = tables.map((r) => r.name).sort();
    expect(names).toEqual(
      [
        'audit_log',
        'login_attempts',
        'notes',
        'presets',
        'sessions',
        'settings',
        'telegram_actions',
        'telegram_links',
        'users',
      ].sort(),
    );
  });

  it('inserts and reads a user', () => {
    const [u] = db
      .insert(schema.users)
      .values({ login: 'alice', password: 'scrypt:1:1:1:xx:yy' })
      .returning()
      .all();
    expect(u.login).toBe('alice');
    expect(u.isDev).toBe(false);

    const read = db.select().from(schema.users).all();
    expect(read).toHaveLength(1);
  });

  it('cascades session deletion when user is deleted', () => {
    const [u] = db
      .insert(schema.users)
      .values({ login: 'bob', password: 'scrypt:1:1:1:xx:yy' })
      .returning()
      .all();

    db.insert(schema.sessions)
      .values({
        userId: u.id,
        token: 't1',
        refreshToken: 'r1',
        expiresAt: '2099-01-01',
      })
      .run();

    db.insert(schema.sessions)
      .values({
        userId: u.id,
        token: 't2',
        refreshToken: 'r2',
        expiresAt: '2099-01-01',
      })
      .run();

    expect(db.select().from(schema.sessions).all()).toHaveLength(2);

    db.delete(schema.users).run();

    expect(db.select().from(schema.sessions).all()).toHaveLength(0);
  });

  it('cascades notes deletion when user is deleted', () => {
    const [u] = db
      .insert(schema.users)
      .values({ login: 'carol', password: 'scrypt:1:1:1:xx:yy' })
      .returning()
      .all();

    db.insert(schema.notes)
      .values({ userId: u.id, title: 'hi', body: 'world' })
      .run();

    expect(db.select().from(schema.notes).all()).toHaveLength(1);

    db.delete(schema.users).run();

    expect(db.select().from(schema.notes).all()).toHaveLength(0);
  });

  it('rejects telegram_actions with invalid action value', () => {
    expect(() => {
      raw
        .prepare(
          "INSERT INTO telegram_actions (token, action, expires_at) VALUES (?, ?, ?)",
        )
        .run('tok', 'invalid', Date.now() + 1000);
    }).toThrow(/CHECK constraint failed: telegram_actions_action_check/);
  });

  it('rejects telegram_actions with invalid status value', () => {
    expect(() => {
      raw
        .prepare(
          "INSERT INTO telegram_actions (token, action, status, expires_at) VALUES (?, ?, ?, ?)",
        )
        .run('tok', 'link_code', 'bogus', Date.now() + 1000);
    }).toThrow(/CHECK constraint failed: telegram_actions_status_check/);
  });

  it('enforces composite PK on settings (userId, key)', () => {
    const [u] = db
      .insert(schema.users)
      .values({ login: 'dave', password: 'scrypt:1:1:1:xx:yy' })
      .returning()
      .all();

    db.insert(schema.settings)
      .values({ userId: u.id, key: 'theme.bg', value: '"#000"' })
      .run();

    expect(() => {
      db.insert(schema.settings)
        .values({ userId: u.id, key: 'theme.bg', value: '"#fff"' })
        .run();
    }).toThrow();
  });
});
