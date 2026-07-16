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

let raw: Database.Database;
let db: BetterSQLite3Database<typeof schema>;
let app: Express;

function createTestApp(): Express {
  const a = express();
  a.use(express.json({ limit: '1mb' }));
  a.use(requestId);
  a.use('/api/auth', createAuthRouter());
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

describe('POST /api/auth/register', () => {
  it('creates a new user (201)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ login: 'alice', password: 'Strong1Pass', name: 'Alice' });
    expect(res.status).toBe(201);
    expect(res.body.user.login).toBe('alice');
    expect(res.body.user.password).toBeUndefined();
  });

  it('returns 200 for existing user with correct password', async () => {
    await request(app).post('/api/auth/register').send({ login: 'alice', password: 'Strong1Pass' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ login: 'alice', password: 'Strong1Pass' });
    expect(res.status).toBe(200);
    expect(res.body.user.login).toBe('alice');
  });

  it('returns 401 (not 404) for existing user with wrong password', async () => {
    await request(app).post('/api/auth/register').send({ login: 'alice', password: 'Strong1Pass' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ login: 'alice', password: 'WrongPass1' });
    expect(res.status).toBe(401);
  });

  it('rejects bad input (zod)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ login: 'a!', password: '' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({ login: 'bob', password: 'Strong1Pass' });
  });

  it('returns 200 for valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ login: 'bob', password: 'Strong1Pass' });
    expect(res.status).toBe(200);
    expect(res.body.user.login).toBe('bob');
  });

  it('returns 401 (not 404) for non-existent user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ login: 'nobody', password: 'Strong1Pass' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ login: 'bob', password: 'WrongPass1' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/token', () => {
  it('returns a token + refresh pair', async () => {
    await request(app).post('/api/auth/register').send({ login: 'carol', password: 'Strong1Pass' });
    const res = await request(app)
      .post('/api/auth/token')
      .send({ login: 'carol', password: 'Strong1Pass' });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
    expect(typeof res.body.expiresIn).toBe('number');
    expect(res.body.user.login).toBe('carol');
  });
});

describe('POST /api/auth/refresh', () => {
  it('rotates refresh and returns new pair', async () => {
    await request(app).post('/api/auth/register').send({ login: 'dave', password: 'Strong1Pass' });
    const t = await request(app)
      .post('/api/auth/token')
      .send({ login: 'dave', password: 'Strong1Pass' });
    const oldRefresh = t.body.refreshToken;
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: oldRefresh });
    expect(res.status).toBe(200);
    expect(res.body.refreshToken).not.toBe(oldRefresh);
  });

  it('rejects replay of used refresh (401)', async () => {
    await request(app).post('/api/auth/register').send({ login: 'erin', password: 'Strong1Pass' });
    const t = await request(app)
      .post('/api/auth/token')
      .send({ login: 'erin', password: 'Strong1Pass' });
    const r1 = await request(app).post('/api/auth/refresh').send({ refreshToken: t.body.refreshToken });
    expect(r1.status).toBe(200);
    const replay = await request(app).post('/api/auth/refresh').send({ refreshToken: t.body.refreshToken });
    expect(replay.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('invalidates the session', async () => {
    await request(app).post('/api/auth/register').send({ login: 'frank', password: 'Strong1Pass' });
    const t = await request(app)
      .post('/api/auth/token')
      .send({ login: 'frank', password: 'Strong1Pass' });
    const me1 = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${t.body.token}`);
    expect(me1.status).toBe(200);

    const lo = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${t.body.token}`);
    expect(lo.status).toBe(200);

    const me2 = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${t.body.token}`);
    expect(me2.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the current user', async () => {
    await request(app).post('/api/auth/register').send({ login: 'gabe', password: 'Strong1Pass' });
    const t = await request(app)
      .post('/api/auth/token')
      .send({ login: 'gabe', password: 'Strong1Pass' });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${t.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.login).toBe('gabe');
  });

  it('rejects without auth (401)', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/auth/password', () => {
  it('changes the password and re-creates a session', async () => {
    await request(app).post('/api/auth/register').send({ login: 'helen', password: 'OldPass1X' });
    const t = await request(app)
      .post('/api/auth/token')
      .send({ login: 'helen', password: 'OldPass1X' });
    const res = await request(app)
      .put('/api/auth/password')
      .set('Authorization', `Bearer ${t.body.token}`)
      .send({ currentPassword: 'OldPass1X', newPassword: 'NewPass2Y' });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');

    const oldToken = t.body.token;
    const meWithOld = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${oldToken}`);
    expect(meWithOld.status).toBe(401);

    const meWithNew = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${res.body.token}`);
    expect(meWithNew.status).toBe(200);

    const loginOld = await request(app)
      .post('/api/auth/login')
      .send({ login: 'helen', password: 'OldPass1X' });
    expect(loginOld.status).toBe(401);

    const loginNew = await request(app)
      .post('/api/auth/login')
      .send({ login: 'helen', password: 'NewPass2Y' });
    expect(loginNew.status).toBe(200);
  });
});

describe('PUT /api/auth/email', () => {
  it('changes the email with valid currentPassword', async () => {
    await request(app).post('/api/auth/register').send({ login: 'ivan', password: 'Strong1Pass' });
    const t = await request(app)
      .post('/api/auth/token')
      .send({ login: 'ivan', password: 'Strong1Pass' });
    const res = await request(app)
      .put('/api/auth/email')
      .set('Authorization', `Bearer ${t.body.token}`)
      .send({ email: 'ivan@example.com', currentPassword: 'Strong1Pass' });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('ivan@example.com');
  });

  it('rejects with wrong currentPassword', async () => {
    await request(app).post('/api/auth/register').send({ login: 'jess', password: 'Strong1Pass' });
    const t = await request(app)
      .post('/api/auth/token')
      .send({ login: 'jess', password: 'Strong1Pass' });
    const res = await request(app)
      .put('/api/auth/email')
      .set('Authorization', `Bearer ${t.body.token}`)
      .send({ email: 'x@y.z', currentPassword: 'WrongPass1' });
    expect(res.status).toBe(401);
  });
});

void eq;
