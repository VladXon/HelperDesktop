import { describe, it, expect } from 'vitest';
import { FetchHttpClient, MockHttpClient } from '../http/http-client.js';

describe('FetchHttpClient', () => {
  it('is instantiable', () => {
    const client = new FetchHttpClient();
    expect(client).toBeDefined();
    expect(client.get).toBeInstanceOf(Function);
    expect(client.post).toBeInstanceOf(Function);
  });
});

describe('MockHttpClient', () => {
  it('returns registered GET response', async () => {
    const client = new MockHttpClient();
    client.onGet('https://example.com/data', { id: 1, name: 'test' });

    const result = await client.get<{ id: number; name: string }>('https://example.com/data');
    expect(result).toEqual({ id: 1, name: 'test' });
  });

  it('returns registered POST response', async () => {
    const client = new MockHttpClient();
    client.onPost('https://example.com/submit', { ok: true });

    const result = await client.post<{ ok: boolean }>('https://example.com/submit', { data: 42 });
    expect(result).toEqual({ ok: true });
  });

  it('returns string responses', async () => {
    const client = new MockHttpClient();
    client.onGet('https://pastebin.com/raw/abc123', 'VGhpcyBpcyBhIHRlc3Q=');

    const result = await client.get<string>('https://pastebin.com/raw/abc123');
    expect(typeof result).toBe('string');
    expect(result).toBe('VGhpcyBpcyBhIHRlc3Q=');
  });

  it('throws on unregistered GET route', async () => {
    const client = new MockHttpClient();

    await expect(client.get('https://unknown.com/')).rejects.toThrow(
      'MockHttpClient: no route registered for GET https://unknown.com/',
    );
  });

  it('throws on unregistered POST route', async () => {
    const client = new MockHttpClient();

    await expect(client.post('https://unknown.com/')).rejects.toThrow(
      'MockHttpClient: no route registered for POST https://unknown.com/',
    );
  });

  it('throws Error instance if registered as error', async () => {
    const client = new MockHttpClient();
    client.onGet('https://fail.com/', new Error('Network error'));

    await expect(client.get('https://fail.com/')).rejects.toThrow('Network error');
  });

  it('supports headers in options (ignored by mock)', async () => {
    const client = new MockHttpClient();
    client.onGet('https://example.com/', { works: true });

    const result = await client.get<{ works: boolean }>('https://example.com/', {
      headers: { Authorization: 'Bearer token' },
    });
    expect(result.works).toBe(true);
  });

  it('onGet and onPost are chainable', async () => {
    const client = new MockHttpClient()
      .onGet('https://a.com/', 'A')
      .onGet('https://b.com/', 'B');

    expect(await client.get('https://a.com/')).toBe('A');
    expect(await client.get('https://b.com/')).toBe('B');
  });
});
