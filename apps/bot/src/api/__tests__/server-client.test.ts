import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ServerClient, ServerError } from '../server-client.js';

interface FetchCall {
  url: string;
  init: RequestInit;
}

function makeFetchMock(responder: (call: FetchCall, attempt: number) => Response | Promise<Response>): {
  fn: typeof fetch;
  calls: FetchCall[];
} {
  const calls: FetchCall[] = [];
  let attempt = 0;
  const fn = vi.fn(async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    attempt += 1;
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const call: FetchCall = { url, init: init ?? {} };
    calls.push(call);
    return responder(call, attempt);
  });
  return { fn: fn as unknown as typeof fetch, calls };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const BASE = 'http://localhost:3001';

describe('ServerClient.request', () => {
  beforeEach(() => {
    process.env.BOT_SHARED_SECRET = 'test-secret';
  });
  afterEach(() => {
    delete process.env.BOT_SHARED_SECRET;
  });

  it('sends X-Bot-Secret and returns parsed JSON', async () => {
    const { fn, calls } = makeFetchMock(() => jsonResponse(200, { ok: true }));
    const client = new ServerClient({ baseUrl: BASE, fetchImpl: fn });
    const out = await client.request<{ ok: boolean }>('/api/health');
    expect(out).toEqual({ ok: true });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(`${BASE}/api/health`);
    const headers = new Headers(calls[0]?.init.headers);
    expect(headers.get('X-Bot-Secret')).toBe('test-secret');
  });

  it('throws ServerError with status and body for 4xx (no retry)', async () => {
    const { fn, calls } = makeFetchMock(() => jsonResponse(404, { error: 'not_found' }));
    const client = new ServerClient({ baseUrl: BASE, fetchImpl: fn, maxRetries: 3, backoffMs: [1, 1, 1] });
    await expect(client.request('/x')).rejects.toMatchObject({
      name: 'ServerError',
      status: 404,
      body: { error: 'not_found' },
    });
    expect(calls).toHaveLength(1);
  });

  it('retries on 5xx up to maxRetries and surfaces last error', async () => {
    const { fn, calls } = makeFetchMock(() => jsonResponse(500, { error: 'fail' }));
    const client = new ServerClient({ baseUrl: BASE, fetchImpl: fn, maxRetries: 3, backoffMs: [1, 1, 1] });
    await expect(client.request('/x')).rejects.toBeInstanceOf(ServerError);
    expect(calls).toHaveLength(3);
  });

  it('retries on network error and succeeds when transient', async () => {
    let n = 0;
    const { fn, calls } = makeFetchMock(() => {
      n += 1;
      if (n < 2) throw new TypeError('ECONNREFUSED');
      return jsonResponse(200, { value: 1 });
    });
    const client = new ServerClient({ baseUrl: BASE, fetchImpl: fn, maxRetries: 3, backoffMs: [1, 1, 1] });
    const out = await client.request<{ value: number }>('/x');
    expect(out).toEqual({ value: 1 });
    expect(calls).toHaveLength(2);
  });

  it('opens circuit after threshold failures and rejects subsequent calls quickly', async () => {
    const { fn } = makeFetchMock(() => jsonResponse(500, { error: 'fail' }));
    const client = new ServerClient({
      baseUrl: BASE,
      fetchImpl: fn,
      maxRetries: 3,
      backoffMs: [1, 1, 1],
      circuit: { failureThreshold: 2, resetTimeoutMs: 60_000 },
    });
    await expect(client.request('/a')).rejects.toBeInstanceOf(ServerError);
    await expect(client.request('/b')).rejects.toBeInstanceOf(ServerError);
    const start = Date.now();
    await expect(client.request('/c')).rejects.toThrow(/circuit/i);
    expect(Date.now() - start).toBeLessThan(100);
  });
});

describe('ServerClient typed methods', () => {
  beforeEach(() => {
    process.env.BOT_SHARED_SECRET = 'test-secret';
  });
  afterEach(() => {
    delete process.env.BOT_SHARED_SECRET;
  });

  it('linkByCode POSTs body and returns {user_id, login}', async () => {
    const { fn, calls } = makeFetchMock(() => jsonResponse(200, { user_id: 7, login: 'alice' }));
    const client = new ServerClient({ baseUrl: BASE, fetchImpl: fn });
    const out = await client.linkByCode('ABC123', 12345);
    expect(out).toEqual({ user_id: 7, login: 'alice' });
    expect(calls[0]?.init.method).toBe('POST');
    expect(calls[0]?.init.body).toBe(JSON.stringify({ code: 'ABC123', telegramId: 12345 }));
  });

  it('userByTelegramId uses GET with query and returns user', async () => {
    const { fn, calls } = makeFetchMock(() => jsonResponse(200, { user_id: 7, login: 'alice', is_dev: true }));
    const client = new ServerClient({ baseUrl: BASE, fetchImpl: fn });
    const out = await client.userByTelegramId(12345);
    expect(out).toEqual({ user_id: 7, login: 'alice', is_dev: true });
    expect(calls[0]?.init.method).toBe('GET');
    expect(calls[0]?.url).toBe(`${BASE}/api/internal/bot/user-by-telegram-id?telegramId=12345`);
  });

  it('userByTelegramId surfaces 404 as ServerError with status 404', async () => {
    const { fn } = makeFetchMock(() => jsonResponse(404, { error: 'not_found' }));
    const client = new ServerClient({ baseUrl: BASE, fetchImpl: fn });
    await expect(client.userByTelegramId(12345)).rejects.toMatchObject({ status: 404 });
  });

  it('approveQrLogin POSTs and returns session', async () => {
    const { fn, calls } = makeFetchMock(() =>
      jsonResponse(200, { session: { token: 't', refreshToken: 'r', expiresIn: 60 } }),
    );
    const client = new ServerClient({ baseUrl: BASE, fetchImpl: fn });
    const out = await client.approveQrLogin('tok', 1);
    expect(out).toEqual({ session: { token: 't', refreshToken: 'r', expiresIn: 60 } });
    expect(calls[0]?.init.method).toBe('POST');
    expect(calls[0]?.init.body).toBe(JSON.stringify({ token: 'tok', telegramId: 1 }));
  });

  it('unlinkByTelegramId POSTs and returns ok', async () => {
    const { fn, calls } = makeFetchMock(() => jsonResponse(200, { ok: true }));
    const client = new ServerClient({ baseUrl: BASE, fetchImpl: fn });
    const out = await client.unlinkByTelegramId(1);
    expect(out).toEqual({ ok: true });
    expect(calls[0]?.init.method).toBe('POST');
    expect(calls[0]?.init.body).toBe(JSON.stringify({ telegramId: 1 }));
  });

  it('health returns status, version, db fields', async () => {
    const { fn } = makeFetchMock(() =>
      jsonResponse(200, { status: 'ok', timestamp: 't', version: '0.1.0', db: 'ok' }),
    );
    const client = new ServerClient({ baseUrl: BASE, fetchImpl: fn });
    const out = await client.health();
    expect(out).toEqual({ status: 'ok', timestamp: 't', version: '0.1.0', db: 'ok' });
  });
});
