import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

function scryptAsync(
  password: string | Buffer,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derived) => {
      if (err) reject(err);
      else resolve(derived);
    });
  });
}

export const SCRYPT_PARAMS = {
  N: 16384,
  r: 8,
  p: 1,
  keylen: 64,
} as const;

const FORMAT_PREFIX = 'scrypt';
const SALT_BYTES = 16;

function toBase64Url(buf: Buffer): string {
  return buf.toString('base64url');
}

function fromBase64Url(s: string): Buffer | null {
  try {
    return Buffer.from(s, 'base64url');
  } catch {
    return null;
  }
}

function isAsciiSafe(s: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(s);
}

export function formatHash(salt: Buffer, hash: Buffer): string {
  return `${FORMAT_PREFIX}:${SCRYPT_PARAMS.N}:${SCRYPT_PARAMS.r}:${SCRYPT_PARAMS.p}:${toBase64Url(salt)}:${toBase64Url(hash)}`;
}

export function parseHash(stored: string): {
  N: number;
  r: number;
  p: number;
  salt: Buffer;
  hash: Buffer;
} | null {
  if (typeof stored !== 'string' || !stored.startsWith(`${FORMAT_PREFIX}:`)) return null;
  const parts = stored.split(':');
  if (parts.length !== 6) return null;
  const [, nStr, rStr, pStr, saltStr, hashStr] = parts;
  if (!nStr || !rStr || !pStr || !saltStr || !hashStr) return null;
  if (!isAsciiSafe(saltStr) || !isAsciiSafe(hashStr)) return null;
  const N = Number(nStr);
  const r = Number(rStr);
  const p = Number(pStr);
  if (!Number.isInteger(N) || N <= 0) return null;
  if (!Number.isInteger(r) || r <= 0) return null;
  if (!Number.isInteger(p) || p <= 0) return null;
  const salt = fromBase64Url(saltStr);
  const hash = fromBase64Url(hashStr);
  if (!salt || !hash) return null;
  if (salt.length === 0 || hash.length === 0) return null;
  return { N, r, p, salt, hash };
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const hash = await scryptAsync(plain.normalize('NFKC'), salt, SCRYPT_PARAMS.keylen, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p,
    maxmem: 64 * 1024 * 1024,
  });
  return formatHash(salt, hash);
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parsed = parseHash(stored);
  if (!parsed) return false;
  if (parsed.N !== SCRYPT_PARAMS.N || parsed.r !== SCRYPT_PARAMS.r || parsed.p !== SCRYPT_PARAMS.p) {
    return false;
  }
  const candidate = await scryptAsync(plain.normalize('NFKC'), parsed.salt, parsed.hash.length, {
    N: parsed.N,
    r: parsed.r,
    p: parsed.p,
    maxmem: 64 * 1024 * 1024,
  });
  if (candidate.length !== parsed.hash.length) return false;
  return timingSafeEqual(candidate, parsed.hash);
}
