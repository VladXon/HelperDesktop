import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { config } from '../../config.js';
import { requireBotSecret, requireDev } from '../auth.js';
import { HttpError, errorHandler } from '../error-handler.js';

function appWith(handler: (req: Request, res: Response, next: NextFunction) => void): Express {
  const app = express();
  app.get('/x', handler, (_req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  return app;
}

describe('HttpError', () => {
  it('marks 4xx errors as exposable', () => {
    const e = new HttpError(401, 'unauthorized', 'msg');
    expect(e.status).toBe(401);
    expect(e.expose).toBe(true);
    expect(e.message).toBe('msg');
  });

  it('marks 5xx errors as non-exposable', () => {
    const e = new HttpError(500, 'internal');
    expect(e.expose).toBe(false);
  });
});

describe('errorHandler', () => {
  it('returns 500 for unknown errors and logs them', async () => {
    const app = appWith((_req, _res, next) => next(new Error('boom')));
    const res = await request(app).get('/x');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('internal_error');
  });

  it('returns the status and message for HttpError 4xx', async () => {
    const app = appWith((_req, _res, next) => next(new HttpError(401, 'unauthorized', 'Bad token')));
    const res = await request(app).get('/x');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Bad token');
  });
});

describe('requireBotSecret', () => {
  const original = config.botSharedSecret;
  afterEach(() => {
    (config as { botSharedSecret: string }).botSharedSecret = original;
  });

  it('passes through when no secret is configured in dev', async () => {
    (config as { botSharedSecret: string }).botSharedSecret = '';
    const app = appWith(requireBotSecret);
    const res = await request(app).get('/x');
    expect(res.status).toBe(200);
  });

  it('rejects 503 in prod when no secret is configured', async () => {
    (config as { botSharedSecret: string }).botSharedSecret = '';
    (config as { isProd: boolean }).isProd = true;
    try {
      const app = appWith(requireBotSecret);
      const res = await request(app).get('/x');
      expect(res.status).toBe(503);
    } finally {
      (config as { isProd: boolean }).isProd = false;
    }
  });

  it('rejects when secret is wrong', async () => {
    (config as { botSharedSecret: string }).botSharedSecret = 'correct-secret-12345';
    const app = appWith(requireBotSecret);
    const res = await request(app).get('/x').set('x-bot-secret', 'wrong-secret-12345');
    expect(res.status).toBe(401);
  });

  it('accepts the correct secret', async () => {
    (config as { botSharedSecret: string }).botSharedSecret = 'correct-secret-12345';
    const app = appWith(requireBotSecret);
    const res = await request(app).get('/x').set('x-bot-secret', 'correct-secret-12345');
    expect(res.status).toBe(200);
  });
});

describe('requireDev', () => {
  it('rejects with 401 when no user', () => {
    const app = appWith((req, _res, next) => {
      req.user = undefined;
      requireDev(req, _res as Response, next);
    });
    void app;
  });

  it('rejects with 403 when user is not dev', async () => {
    const app = express();
    app.get(
      '/x',
      (req, _res, next) => {
        req.user = { id: 1, login: 'a', name: '', email: '', isDev: false, createdAt: '' };
        next();
      },
      requireDev,
      (_req, res) => res.json({ ok: true }),
    );
    app.use(errorHandler);
    const res = await request(app).get('/x');
    expect(res.status).toBe(403);
  });

  it('passes when user is dev', async () => {
    const app = express();
    app.get(
      '/x',
      (req, _res, next) => {
        req.user = { id: 1, login: 'a', name: '', email: '', isDev: true, createdAt: '' };
        next();
      },
      requireDev,
      (_req, res) => res.json({ ok: true }),
    );
    const res = await request(app).get('/x');
    expect(res.status).toBe(200);
  });
});

void beforeEach;
