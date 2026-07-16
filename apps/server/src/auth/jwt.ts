import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

const TOKEN_TTL_SECONDS = 24 * 60 * 60;

export interface AccessTokenPayload {
  userId: number;
  login: string;
  jti: string;
  iat: number;
  exp: number;
}

export function signToken(payload: { userId: number; login: string }): string {
  return jwt.sign({ userId: payload.userId, login: payload.login }, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: TOKEN_TTL_SECONDS,
    jwtid: randomUUID(),
  });
}

export function verifyToken(token: string): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    if (typeof decoded !== 'object' || decoded === null) return null;
    const d = decoded as Record<string, unknown>;
    if (typeof d.userId !== 'number' || typeof d.login !== 'string') return null;
    if (typeof d.jti !== 'string' || typeof d.iat !== 'number' || typeof d.exp !== 'number') {
      return null;
    }
    return d as unknown as AccessTokenPayload;
  } catch {
    return null;
  }
}

export function tokenTtlSeconds(): number {
  return TOKEN_TTL_SECONDS;
}
