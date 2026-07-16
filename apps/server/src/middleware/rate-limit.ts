import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import type { Request } from 'express';
import { config } from '../config.js';

function ipKey(req: Request): string {
  return req.ip ?? 'unknown';
}

export const globalRateLimit: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000,
  limit: config.isProd ? 100 : 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: ipKey,
  message: { error: 'rate_limited' },
});

export const authPerMinLimit: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: ipKey,
  message: { error: 'rate_limited' },
});

export const authRateLimit: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: ipKey,
  message: { error: 'rate_limited' },
});
