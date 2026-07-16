import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import express, { type Express } from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setDb, resetDb, schema } from '../db/index.js';
import { errorHandler } from '../middleware/error-handler.js';
import { requestId } from '../middleware/request-id.js';
import { createAuthRouter } from '../routes/auth.js';
import { createDevRouter } from '../routes/dev.js';
import { runCleanupOnce } from '../services/cleanup.js';

let raw: Database.Database;
let db: BetterSQLite3Database<typeof schema>;
let app: Express;
let userToken: string;
let devToken: string;

async function registerMakeDev(login: string, makeDev: boolean): Promise<string> {
  await request(app)
    .post('/api/auth/register')
    .send({ login, password: 'Strong1Pass' });
  const tok = (
    await request(app)
      .post('/api/auth/token')
      .send({ login, password: 'Strong1Pass' })
  ).body.token;
  if (makeDev) {
    db.update(schema.users)
      .set({ isDev: true })
      .where(schema.users.login as never)
      .run();
  }
  return tok;
}

function createTestApp(): Express {
  const a = express();
  a.use(express.json({ limit: '1mb' }));
  a.use(requestId);
  a.use('/api/auth', createAuthRouter());
  a.use('/api/dev', createDevRouter());
  a.use(errorHandler);
  return a;
}

beforeEach(() => {
  raw = new Database(':memory:');
  raw.pragma('foreign_keys = ON');
  db = drizzle(raw, { schema });
  migrate(db, { migrationsFolder: './src/db/migrations' });
  setDb(db, raw);
  app = createTestApp();
});

afterEach(() => {
  resetDb();
});

describe('Dev endpoints', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ login: 'normal', password: 'Strong1Pass' });
    userToken = (
      await request(app)
        .post('/api/auth/token')
        .send({ login: 'normal', password: 'Strong1Pass' })
    ).body.token;

    await request(app)
      .post('/api/auth/register')
      .send({ login: 'boss', password: 'BossPass1' });
    devToken = (
      await request(app)
        .post('/api/auth/token')
        .send({ login: 'boss', password: 'BossPass1' })
    ).body.token;
    db.update(schema.users)
      .set({ isDev: true })
      .where(eq(schema.users.login, 'boss'))
      .run();
  });

  it('returns 403 for non-dev user', async () => {
    const res = await request(app)
      .get('/api/dev/serverinfo')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it('returns serverinfo for dev', async () => {
    const res = await request(app)
      .get('/api/dev/serverinfo')
      .set('Authorization', `Bearer ${devToken}`);
    expect(res.status).toBe(200);
    expect(res.body.version).toBe('0.1.0');
    expect(typeof res.body.uptime).toBe('number');
    expect(typeof res.body.users_count).toBe('number');
  });

  it('promotes user via op', async () => {
    const res = await request(app)
      .post('/api/dev/op')
      .set('Authorization', `Bearer ${devToken}`)
      .send({ login: 'normal' });
    expect(res.status).toBe(200);
    const u = db.select().from(schema.users).all();
    const normal = u.find((r) => r.login === 'normal');
    expect(Boolean(normal?.isDev)).toBe(true);
  });

  it('returns 404 for op on missing user', async () => {
    const res = await request(app)
      .post('/api/dev/op')
      .set('Authorization', `Bearer ${devToken}`)
      .send({ login: 'nosuch' });
    expect(res.status).toBe(404);
  });

  it('rejects op for non-dev', async () => {
    const res = await request(app)
      .post('/api/dev/op')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ login: 'normal' });
    expect(res.status).toBe(403);
  });

  it('rejects restart in dev (only allowed in prod)', async () => {
    const res = await request(app)
      .post('/api/dev/restart')
      .set('Authorization', `Bearer ${devToken}`);
    expect(res.status).toBe(400);
  });

  it('requires auth on dev endpoints', async () => {
    const res = await request(app).get('/api/dev/serverinfo');
    expect(res.status).toBe(401);
  });
});

void registerMakeDev;

describe('Cleanup job', () => {
  it('removes expired sessions, actions, attempts, audit', () => {
    const past = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const oldAudit = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
    db.insert(schema.users)
      .values({ login: 'u', password: 'p' })
      .run();
    const user = db.select().from(schema.users).all()[0]!;
    db.insert(schema.sessions)
      .values({
        userId: user.id,
        token: 't1',
        refreshToken: 'r1',
        expiresAt: past,
      })
      .run();
    db.insert(schema.sessions)
      .values({
        userId: user.id,
        token: 't2',
        refreshToken: 'r2',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      })
      .run();
    db.insert(schema.telegramActions)
      .values({
        token: 'act1',
        action: 'link_code',
        expiresAt: Math.floor(Date.now() / 1000) - 25 * 60 * 60,
      })
      .run();
    db.insert(schema.loginAttempts)
      .values({ ip: '127.0.0.1', login: 'u', success: false, createdAt: past })
      .run();
    db.insert(schema.auditLog)
      .values({ action: 'login', createdAt: oldAudit })
      .run();
    db.insert(schema.auditLog)
      .values({ action: 'login', createdAt: new Date().toISOString() })
      .run();

    const counts = runCleanupOnce(db);
    expect(counts.sessions).toBe(1);
    expect(counts.actions).toBe(1);
    expect(counts.attempts).toBe(1);
    expect(counts.audit).toBe(1);

    const sessions = db.select().from(schema.sessions).all();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.token).toBe('t2');
    const audits = db.select().from(schema.auditLog).all();
    expect(audits).toHaveLength(1);
  });
});
