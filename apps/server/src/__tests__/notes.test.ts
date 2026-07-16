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
import { createNotesRouter } from '../routes/notes.js';

let raw: Database.Database;
let db: BetterSQLite3Database<typeof schema>;
let app: Express;
let token: string;
let userId: number;

async function registerAndLogin(): Promise<void> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ login: 'testuser', password: 'Strong1Pass' });
  userId = res.body.user.id;
  const tokenRes = await request(app)
    .post('/api/auth/token')
    .send({ login: 'testuser', password: 'Strong1Pass' });
  token = tokenRes.body.token;
}

function createTestApp(): Express {
  const a = express();
  a.use(express.json({ limit: '1mb' }));
  a.use(requestId);
  a.use('/api/auth', createAuthRouter());
  a.use('/api/notes', createNotesRouter());
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

describe('Notes CRUD', () => {
  beforeEach(async () => {
    await registerAndLogin();
  });

  it('creates a note', async () => {
    const res = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Hello', body: 'World', tags: ['a', 'b'] });
    expect(res.status).toBe(201);
    expect(res.body.note.title).toBe('Hello');
    expect(res.body.note.tags).toEqual(['a', 'b']);
  });

  it('lists user notes only', async () => {
    await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'A' });
    await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'B' });
    const res = await request(app)
      .get('/api/notes')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.notes).toHaveLength(2);
  });

  it('does not list another user notes', async () => {
    await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'A' });
    await request(app)
      .post('/api/auth/register')
      .send({ login: 'other', password: 'OtherPass1' });
    const otherToken = (
      await request(app)
        .post('/api/auth/token')
        .send({ login: 'other', password: 'OtherPass1' })
    ).body.token;
    const res = await request(app)
      .get('/api/notes')
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.body.notes).toHaveLength(0);
  });

  it('updates note owned by user', async () => {
    const create = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'A' });
    const id = create.body.note.id;
    const res = await request(app)
      .put(`/api/notes/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'A2' });
    expect(res.status).toBe(200);
    expect(res.body.note.title).toBe('A2');
  });

  it('returns 404 on update of other user note', async () => {
    const create = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'A' });
    const id = create.body.note.id;
    await request(app)
      .post('/api/auth/register')
      .send({ login: 'other', password: 'OtherPass1' });
    const otherToken = (
      await request(app)
        .post('/api/auth/token')
        .send({ login: 'other', password: 'OtherPass1' })
    ).body.token;
    const res = await request(app)
      .put(`/api/notes/${id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: 'hijack' });
    expect(res.status).toBe(404);
  });

  it('deletes own note', async () => {
    const create = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'A' });
    const id = create.body.note.id;
    const del = await request(app)
      .delete(`/api/notes/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
    const list = await request(app)
      .get('/api/notes')
      .set('Authorization', `Bearer ${token}`);
    expect(list.body.notes).toHaveLength(0);
  });

  it('toggles pinned and completed', async () => {
    const create = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'A' });
    const id = create.body.note.id;
    const r1 = await request(app)
      .patch(`/api/notes/${id}/toggle`)
      .set('Authorization', `Bearer ${token}`)
      .send({ field: 'pinned' });
    expect(r1.body.note.pinned).toBe(true);
    const r2 = await request(app)
      .patch(`/api/notes/${id}/toggle`)
      .set('Authorization', `Bearer ${token}`)
      .send({ field: 'completed' });
    expect(r2.body.note.completed).toBe(true);
  });

  it('rejects bad id on update', async () => {
    const res = await request(app)
      .put('/api/notes/abc')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'X' });
    expect(res.status).toBe(400);
  });

  it('rejects toggle with invalid field', async () => {
    const create = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'A' });
    const res = await request(app)
      .patch(`/api/notes/${create.body.note.id}/toggle`)
      .set('Authorization', `Bearer ${token}`)
      .send({ field: 'evil' });
    expect(res.status).toBe(400);
  });

  it('rejects without auth', async () => {
    const res = await request(app).get('/api/notes');
    expect(res.status).toBe(401);
  });

  it('rejects invalid body on create', async () => {
    const res = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'x'.repeat(300) });
    expect(res.status).toBe(400);
  });

  it('preserves pinned-first ordering on list', async () => {
    await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'normal' });
    const pinned = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'pinned' });
    await request(app)
      .patch(`/api/notes/${pinned.body.note.id}/toggle`)
      .set('Authorization', `Bearer ${token}`)
      .send({ field: 'pinned' });
    const res = await request(app)
      .get('/api/notes')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.notes[0].title).toBe('pinned');
  });
});

void userId;
