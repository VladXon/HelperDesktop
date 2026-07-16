import { describe, expect, it } from 'vitest';
import { LEVELS, maskSensitive, SENSITIVE_KEYS } from '../logger.js';

describe('maskSensitive', () => {
  it('masks top-level sensitive keys', () => {
    const masked = maskSensitive({ login: 'alice', password: 'secret123' });
    expect(masked).toEqual({ login: 'alice', password: '***' });
  });

  it('masks nested sensitive keys', () => {
    const masked = maskSensitive({
      user: { name: 'bob', token: 'tk' },
      body: { refreshToken: 'rt' },
    });
    expect(masked).toEqual({
      user: { name: 'bob', token: '***' },
      body: { refreshToken: '***' },
    });
  });

  it('masks inside arrays', () => {
    const masked = maskSensitive([{ password: 'x' }, { password: 'y' }]);
    expect(masked).toEqual([{ password: '***' }, { password: '***' }]);
  });

  it('passes through null and undefined', () => {
    expect(maskSensitive(null)).toBeNull();
    expect(maskSensitive(undefined)).toBeUndefined();
  });

  it('passes through primitives', () => {
    expect(maskSensitive('hello')).toBe('hello');
    expect(maskSensitive(42)).toBe(42);
    expect(maskSensitive(true)).toBe(true);
  });

  it('does not mask non-sensitive keys', () => {
    const masked = maskSensitive({ login: 'alice', email: 'a@b.c' });
    expect(masked).toEqual({ login: 'alice', email: 'a@b.c' });
  });

  it('honors custom key set', () => {
    const masked = maskSensitive({ apiKey: 'k1', safe: 'v' }, new Set(['apiKey']));
    expect(masked).toEqual({ apiKey: '***', safe: 'v' });
  });

  it('masks both x-bot-secret and password', () => {
    const masked = maskSensitive({
      password: 'pw',
      'x-bot-secret': 'bs',
      authorization: 'Bearer x',
    });
    expect(masked).toEqual({
      password: '***',
      'x-bot-secret': '***',
      authorization: '***',
    });
  });
});

describe('LEVELS', () => {
  it('exposes canonical level order', () => {
    expect(LEVELS).toEqual(['trace', 'debug', 'info', 'warn', 'error', 'fatal']);
  });

  it('SENSITIVE_KEYS contains the required keys', () => {
    expect(SENSITIVE_KEYS.has('password')).toBe(true);
    expect(SENSITIVE_KEYS.has('token')).toBe(true);
    expect(SENSITIVE_KEYS.has('refreshToken')).toBe(true);
    expect(SENSITIVE_KEYS.has('x-bot-secret')).toBe(true);
  });
});
