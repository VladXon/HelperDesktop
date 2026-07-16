import { describe, expect, it } from 'vitest';
import { SCRYPT_PARAMS, hashPassword, verifyPassword } from '../password.js';

describe('SCRYPT_PARAMS', () => {
  it('exports the spec-mandated values', () => {
    expect(SCRYPT_PARAMS.N).toBe(16384);
    expect(SCRYPT_PARAMS.r).toBe(8);
    expect(SCRYPT_PARAMS.p).toBe(1);
    expect(SCRYPT_PARAMS.keylen).toBe(64);
  });
});

describe('hashPassword + verifyPassword', () => {
  it('roundtrips the same password', async () => {
    const hashed = await hashPassword('Strong1Pass');
    expect(hashed.startsWith('scrypt:')).toBe(true);
    expect(await verifyPassword('Strong1Pass', hashed)).toBe(true);
  });

  it('produces different hashes for the same password (random salt)', async () => {
    const a = await hashPassword('Strong1Pass');
    const b = await hashPassword('Strong1Pass');
    expect(a).not.toBe(b);
  });

  it('produces hashes with the expected format scrypt:N:r:p:salt:hash', async () => {
    const hashed = await hashPassword('Strong1Pass');
    const parts = hashed.split(':');
    expect(parts).toHaveLength(6);
    expect(parts[0]).toBe('scrypt');
    expect(Number(parts[1])).toBe(SCRYPT_PARAMS.N);
    expect(Number(parts[2])).toBe(SCRYPT_PARAMS.r);
    expect(Number(parts[3])).toBe(SCRYPT_PARAMS.p);
    expect(parts[4]).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(parts[5]).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('rejects a wrong password', async () => {
    const hashed = await hashPassword('Strong1Pass');
    expect(await verifyPassword('WrongPass1', hashed)).toBe(false);
  });

  it('rejects an empty password', async () => {
    const hashed = await hashPassword('Strong1Pass');
    expect(await verifyPassword('', hashed)).toBe(false);
  });

  it('rejects malformed hash strings without throwing', async () => {
    expect(await verifyPassword('Strong1Pass', 'not-a-hash')).toBe(false);
    expect(await verifyPassword('Strong1Pass', 'scrypt:16384:8:1')).toBe(false);
    expect(await verifyPassword('Strong1Pass', 'scrypt:abc:8:1:xx:yy')).toBe(false);
    expect(await verifyPassword('Strong1Pass', 'scrypt:16384:8:1:!!:yy')).toBe(false);
  });

  it('rejects hashes with wrong params (timing-safe)', async () => {
    const bad = 'scrypt:1:1:1:AA:BB';
    expect(await verifyPassword('Strong1Pass', bad)).toBe(false);
  });

  it('handles long passwords', async () => {
    const long = 'A1' + 'a'.repeat(254);
    const hashed = await hashPassword(long);
    expect(await verifyPassword(long, hashed)).toBe(true);
  });
});
