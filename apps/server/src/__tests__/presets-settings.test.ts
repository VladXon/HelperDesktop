import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import express, { type Express } from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setDb, resetDb, schema } from '../db/index.js';
import { errorHandler } from '../middleware/error-handler.js';
import { requestId } from '../middleware/request-id.js';
import { createAuthRouter } from '../routes/auth.js';
import { createPresetsRouter } from '../routes/presets.js';
import { createSettingsRouter } from '../routes/settings.js';

let raw: Database.Database;
let db: BetterSQLite3Database<typeof schema>;
let app: Express;
let token: string;

async function registerAndLogin(): Promise<void> {
  await request(app)
    .post('/api/auth/register')
    .send({ login: 'testuser', password: 'Strong1Pass' });
  const r = await request(app)
    .post('/api/auth/token')
    .send({ login: 'testuser', password: 'Strong1Pass' });
  token = r.body.token;
}

function createTestApp(): Express {
  const a = express();
  a.use(express.json({ limit: '1mb' }));
  a.use(requestId);
  a.use('/api/auth', createAuthRouter());
  a.use('/api/presets', createPresetsRouter());
  a.use('/api/settings', createSettingsRouter());
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

describe('Presets CRUD', () => {
  beforeEach(async () => {
    await registerAndLogin();
  });

  it('creates a preset', async () => {
    const res = await request(app)
      .post('/api/presets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Work', apps: [{ name: 'Code', path: '/c/code.exe' }] });
    expect(res.status).toBe(201);
    expect(res.body.preset.name).toBe('Work');
    expect(res.body.preset.apps[0].name).toBe('Code');
  });

  it('updates preset', async () => {
    const create = await request(app)
      .post('/api/presets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Work' });
    const res = await request(app)
      .put(`/api/presets/${create.body.preset.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Play' });
    expect(res.status).toBe(200);
    expect(res.body.preset.name).toBe('Play');
  });

  it('deletes preset', async () => {
    const create = await request(app)
      .post('/api/presets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X' });
    const del = await request(app)
      .delete(`/api/presets/${create.body.preset.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
  });

  it('toggles pin', async () => {
    const create = await request(app)
      .post('/api/presets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X' });
    const r = await request(app)
      .patch(`/api/presets/${create.body.preset.id}/toggle-pin`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(r.body.preset.pinned).toBe(true);
  });

  it('does not return other user preset', async () => {
    const c = await request(app)
      .post('/api/presets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X' });
    await request(app)
      .post('/api/auth/register')
      .send({ login: 'other', password: 'OtherPass1' });
    const otherToken = (
      await request(app)
        .post('/api/auth/token')
        .send({ login: 'other', password: 'OtherPass1' })
    ).body.token;
    const list = await request(app)
      .get('/api/presets')
      .set('Authorization', `Bearer ${otherToken}`);
    expect(list.body.presets).toHaveLength(0);
    const upd = await request(app)
      .put(`/api/presets/${c.body.preset.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ name: 'hijack' });
    expect(upd.status).toBe(404);
  });
});

describe('Settings CRUD', () => {
  beforeEach(async () => {
    await registerAndLogin();
  });

  it('returns empty data initially', async () => {
    const res = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.data).toEqual({});
  });

  it('sets and gets single setting', async () => {
    await request(app)
      .put('/api/settings/theme.bg-primary')
      .set('Authorization', `Bearer ${token}`)
      .send({ value: '#000' });
    const res = await request(app)
      .get('/api/settings/theme.bg-primary')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.value).toBe('#000');
  });

  it('updates existing setting', async () => {
    await request(app)
      .put('/api/settings/theme.bg-primary')
      .set('Authorization', `Bearer ${token}`)
      .send({ value: '#000' });
    await request(app)
      .put('/api/settings/theme.bg-primary')
      .set('Authorization', `Bearer ${token}`)
      .send({ value: '#111' });
    const res = await request(app)
      .get('/api/settings/theme.bg-primary')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.value).toBe('#111');
  });

  it('returns 404 for missing key', async () => {
    const res = await request(app)
      .get('/api/settings/missing.key')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('handles batch upsert', async () => {
    const res = await request(app)
      .post('/api/settings/batch')
      .set('Authorization', `Bearer ${token}`)
      .send({ data: { 'theme.bg-primary': '#000', 'theme.bg-secondary': '#111' } });
    expect(res.status).toBe(200);
    const get = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${token}`);
    expect(get.body.data['theme.bg-primary']).toBe('#000');
    expect(get.body.data['theme.bg-secondary']).toBe('#111');
  });

  it('isolates settings per user', async () => {
    await request(app)
      .put('/api/settings/k1')
      .set('Authorization', `Bearer ${token}`)
      .send({ value: 'v1' });
    await request(app)
      .post('/api/auth/register')
      .send({ login: 'other', password: 'OtherPass1' });
    const otherToken = (
      await request(app)
        .post('/api/auth/token')
        .send({ login: 'other', password: 'OtherPass1' })
    ).body.token;
    const res = await request(app)
      .get('/api/settings/k1')
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
  });

  it('preserves complex json values', async () => {
    await request(app)
      .put('/api/settings/complex')
      .set('Authorization', `Bearer ${token}`)
      .send({ value: { a: 1, b: [2, 3] } });
    const res = await request(app)
      .get('/api/settings/complex')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.value).toEqual({ a: 1, b: [2, 3] });
  });
});
