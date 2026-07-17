import type { Express } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../index.js';

function getApp(): Express {
  return createApp();
}

describe('GET /api/health', () => {
  it('returns ok status with version and timestamp', async () => {
    const app = getApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.version).toBe('0.1.0');
    expect(typeof res.body.timestamp).toBe('string');
    expect(res.body.db).toBe('ok');
  });

  it('returns 404 for unknown routes', async () => {
    const app = getApp();
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('not_found');
  });

  it('rejects oversized JSON bodies', async () => {
    const app = getApp();
    const huge = { data: 'x'.repeat(2 * 1024 * 1024) };
    const res = await request(app)
      .post('/api/health')
      .set('content-type', 'application/json')
      .send(JSON.stringify(huge));
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
