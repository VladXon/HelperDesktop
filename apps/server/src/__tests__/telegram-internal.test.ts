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
import { createTelegramRouter } from '../routes/telegram.js';
import { createInternalRouter } from '../routes/internal.js';
import { config } from '../config.js';

let raw: Database.Database;
let db: BetterSQLite3Database<typeof schema>;
let app: Express;
let userToken: string;
let userId: number;

async function registerAndLogin(login = 'tester'): Promise<void> {
  await request(app)
    .post('/api/auth/register')
    .send({ login, password: 'Strong1Pass' });
  const r = await request(app)
    .post('/api/auth/token')
    .send({ login, password: 'Strong1Pass' });
  userToken = r.body.token;
  userId = r.body.user.id;
}

function createTestApp(): Express {
  const a = express();
  a.use(express.json({ limit: '1mb' }));
  a.use(requestId);
  a.use('/api/auth', createAuthRouter());
  a.use('/api/telegram', createTelegramRouter());
  a.use('/api/internal/bot', createInternalRouter());
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

describe('Telegram public', () => {
  beforeEach(async () => {
    await registerAndLogin();
  });

  it('returns not-linked status initially', async () => {
    const res = await request(app)
      .get('/api/telegram/status')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.body).toEqual({ linked: false });
  });

  it('creates a link code and returns it', async () => {
    const res = await request(app)
      .post('/api/telegram/link/code')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.code).toMatch(/^[A-Z0-9]{6}$/);
    expect(res.body.expiresIn).toBe(300);
  });

  it('returns pending for fresh code', async () => {
    const code = (
      await request(app)
        .post('/api/telegram/link/code')
        .set('Authorization', `Bearer ${userToken}`)
    ).body.code;
    const res = await request(app)
      .get(`/api/telegram/link/check?code=${code}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.body.status).toBe('pending');
  });

  it('returns not_found for unknown code', async () => {
    const res = await request(app)
      .get('/api/telegram/link/check?code=ZZZZZZ')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.body.status).toBe('not_found');
  });

  it('creates qr login request without auth', async () => {
    const res = await request(app).post('/api/telegram/qr/login/request');
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.deepLink).toMatch(/^https:\/\/t\.me\//);
  });

  it('returns pending for fresh qr token', async () => {
    const { token } = (
      await request(app).post('/api/telegram/qr/login/request')
    ).body;
    const res = await request(app).get(`/api/telegram/qr/login/check?token=${token}`);
    expect(res.body.status).toBe('pending');
  });

  it('returns not_found for unknown qr token', async () => {
    const res = await request(app).get(
      '/api/telegram/qr/login/check?token=zzz_unknown',
    );
    expect(res.body.status).toBe('not_found');
  });

  it('unlinks when not linked', async () => {
    const res = await request(app)
      .post('/api/telegram/unlink')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
  });

  it('blocks status without auth', async () => {
    const res = await request(app).get('/api/telegram/status');
    expect(res.status).toBe(401);
  });
});

describe('Telegram internal (bot)', () => {
  const originalBotSecret = config.botSharedSecret;
  const TEST_BOT_SECRET = 'test-bot-secret-for-tests';

  beforeEach(() => {
    (config as { botSharedSecret: string }).botSharedSecret = TEST_BOT_SECRET;
  });

  afterEach(() => {
    (config as { botSharedSecret: string }).botSharedSecret = originalBotSecret;
  });

  function botAuth(): { [key: string]: string } {
    return { 'x-bot-secret': TEST_BOT_SECRET };
  }

  it('links by code and returns login', async () => {
    await registerAndLogin();
    const code = (
      await request(app)
        .post('/api/telegram/link/code')
        .set('Authorization', `Bearer ${userToken}`)
    ).body.code;
    const res = await request(app)
      .post('/api/internal/bot/link-by-code')
      .set(botAuth())
      .send({ code, telegramId: 12345 });
    expect(res.status).toBe(200);
    expect(res.body.user_id).toBe(userId);
    expect(res.body.login).toBe('tester');
  });

  it('rejects link for expired code', async () => {
    await registerAndLogin();
    const code = (
      await request(app)
        .post('/api/telegram/link/code')
        .set('Authorization', `Bearer ${userToken}`)
    ).body.code;
    db.update(schema.telegramActions)
      .set({ expiresAt: Math.floor(Date.now() / 1000) - 1 })
      .where(eq(schema.telegramActions.token, code))
      .run();
    const res = await request(app)
      .post('/api/internal/bot/link-by-code')
      .set(botAuth())
      .send({ code, telegramId: 12345 });
    expect(res.status).toBe(410);
  });

  it('finds user by telegram id after link', async () => {
    await registerAndLogin();
    const code = (
      await request(app)
        .post('/api/telegram/link/code')
        .set('Authorization', `Bearer ${userToken}`)
    ).body.code;
    await request(app)
      .post('/api/internal/bot/link-by-code')
      .set(botAuth())
      .send({ code, telegramId: 99999 });
    const res = await request(app).get('/api/internal/bot/user-by-telegram-id?telegramId=99999').set(botAuth());
    expect(res.status).toBe(200);
    expect(res.body.user_id).toBe(userId);
  });

  it('returns 404 from user-by-telegram-id when not linked', async () => {
    const res = await request(app).get(
      '/api/internal/bot/user-by-telegram-id?telegramId=777',
    ).set(botAuth());
    expect(res.status).toBe(404);
  });

  it('approves qr login and creates session', async () => {
    await registerAndLogin();
    const code = (
      await request(app)
        .post('/api/telegram/link/code')
        .set('Authorization', `Bearer ${userToken}`)
    ).body.code;
    await request(app)
      .post('/api/internal/bot/link-by-code')
      .set(botAuth())
      .send({ code, telegramId: 55555 });
    const { token: qrToken } = (
      await request(app).post('/api/telegram/qr/login/request')
    ).body;
    const res = await request(app)
      .post('/api/internal/bot/qr-login-approve')
      .set(botAuth())
      .send({ token: qrToken, telegramId: 55555 });
    expect(res.status).toBe(200);
    expect(res.body.session.token).toBeTruthy();
    expect(res.body.session.refreshToken).toBeTruthy();
  });

  it('unlinks by telegram id', async () => {
    await registerAndLogin();
    const code = (
      await request(app)
        .post('/api/telegram/link/code')
        .set('Authorization', `Bearer ${userToken}`)
    ).body.code;
    await request(app)
      .post('/api/internal/bot/link-by-code')
      .set(botAuth())
      .send({ code, telegramId: 11111 });
    const res = await request(app)
      .post('/api/internal/bot/unlink-by-telegram-id')
      .set(botAuth())
      .send({ telegramId: 11111 });
    expect(res.status).toBe(200);
    const status = await request(app)
      .get('/api/telegram/status')
      .set('Authorization', `Bearer ${userToken}`);
    expect(status.body.linked).toBe(false);
  });

  it('returns 404 for qr-login-approve with unlinked telegram', async () => {
    const { token: qrToken } = (
      await request(app).post('/api/telegram/qr/login/request')
    ).body;
    const res = await request(app)
      .post('/api/internal/bot/qr-login-approve')
      .set(botAuth())
      .send({ token: qrToken, telegramId: 99999 });
    expect(res.status).toBe(404);
  });
});
