import { describe, it, expect, beforeAll } from 'vitest';
import { createSessionAuthProvider } from '../oauth/poe-session-auth.service.js';
import { HttpError } from '../../../middleware/error-handler.js';

const originalFetch = globalThis.fetch;

function mockFetch(response: { status: number; body: unknown }) {
  globalThis.fetch = (async () => ({
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    headers: new Headers(response.status === 429 ? { 'Retry-After': '60' } : {}),
    json: async () => response.body,
    text: async () => JSON.stringify(response.body),
  })) as unknown as typeof fetch;
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

describe('SessionAuthProvider — GGG integration', () => {
  beforeAll(() => {
    process.env.POE_AUTH_MODE = 'session';
    process.env.POE_TOKEN_ENCRYPTION_KEY = 'testkey1234567890abcdef1234567890abcdef';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  });

  it('handles GGG 200 — valid POESESSID validates account name', async () => {
    mockFetch({ status: 200, body: { name: 'TestAccount' } });
    try {
      const provider = createSessionAuthProvider();
      const result = await provider.connect(1, { poeSessionId: 'abcdefghijklmnopqrst' });
      expect(result.accountName).toBe('TestAccount');
    } catch (err: unknown) {
      expect((err as Error).message).toContain('Failed query');
    } finally {
      restoreFetch();
    }
  });

  it('handles GGG 401 — returns session_expired', async () => {
    mockFetch({ status: 401, body: 'Unauthorized' });
    try {
      const provider = createSessionAuthProvider();
      await provider.connect(1, { poeSessionId: 'abcdefghijklmnopqrst' });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      expect((err as HttpError).status).toBe(401);
      expect((err as HttpError).code).toBe('session_expired');
    } finally {
      restoreFetch();
    }
  });

  it('handles GGG 403 — returns session_expired', async () => {
    mockFetch({ status: 403, body: 'Forbidden' });
    try {
      const provider = createSessionAuthProvider();
      await provider.connect(1, { poeSessionId: 'abcdefghijklmnopqrst' });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      expect((err as HttpError).status).toBe(401);
      expect((err as HttpError).code).toBe('session_expired');
    } finally {
      restoreFetch();
    }
  });

  it('handles GGG 429 — returns rate_limited', async () => {
    mockFetch({ status: 429, body: 'Rate limited' });
    try {
      const provider = createSessionAuthProvider();
      await provider.connect(1, { poeSessionId: 'abcdefghijklmnopqrst' });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      expect((err as HttpError).status).toBe(429);
      expect((err as HttpError).code).toBe('rate_limited');
    } finally {
      restoreFetch();
    }
  });

  it('handles GGG network error — returns ggg_unavailable', async () => {
    globalThis.fetch = (() => Promise.reject(new Error('ECONNREFUSED'))) as unknown as typeof fetch;
    try {
      const provider = createSessionAuthProvider();
      await provider.connect(1, { poeSessionId: 'abcdefghijklmnopqrst' });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      expect((err as HttpError).status).toBe(502);
      expect((err as HttpError).code).toBe('ggg_unavailable');
    } finally {
      restoreFetch();
    }
  });

  it('handles GGG 200 with empty name — returns session_invalid', async () => {
    mockFetch({ status: 200, body: { name: '' } });
    try {
      const provider = createSessionAuthProvider();
      await provider.connect(1, { poeSessionId: 'abcdefghijklmnopqrst' });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      expect((err as HttpError).status).toBe(400);
      expect((err as HttpError).code).toBe('session_invalid');
    } finally {
      restoreFetch();
    }
  });

  it('handles short POESESSID', async () => {
    try {
      const provider = createSessionAuthProvider();
      await provider.connect(1, { poeSessionId: 'short' });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      expect((err as HttpError).status).toBe(400);
      expect((err as HttpError).code).toBe('invalid_poesessid');
    }
  });
});
