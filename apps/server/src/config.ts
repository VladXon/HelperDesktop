import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

const here = dirname(fileURLToPath(import.meta.url));
const candidates = [
  join(here, '.env'),
  join(here, '..', '..', '.env'),
  join(here, '..', '..', '..', '.env'),
  join(process.cwd(), '.env'),
  join(process.cwd(), 'apps', 'server', '.env'),
];
for (const p of candidates) {
  if (existsSync(p)) {
    loadDotenv({ path: p });
    break;
  }
}

export const SCRYPT_PARAMS = {
  N: 16384,
  r: 8,
  p: 1,
  keylen: 64,
} as const;

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(3001),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    DATABASE_URL: z.string().default(''),
    DB_PATH: z.string().min(1).default('./helperdesktop.db'),
    BOT_PATH: z.string().min(1).default('../bot'),
    BOT_USERNAME: z.string().default(''),
    JWT_SECRET: z.string().default(''),
    BOT_SHARED_SECRET: z.string().default(''),
    CORS_ORIGINS: z.string().default(''),
    POE_CLIENT_ID: z.string().default(''),
    POE_CLIENT_SECRET: z.string().default(''),
    POE_REDIRECT_URI: z.string().default(''),
    POE_TOKEN_ENCRYPTION_KEY: z.string().default(''),
  })
  .transform((env) => {
    const isProd = env.NODE_ENV === 'production';
    const warnings: string[] = [];

    let jwtSecret = env.JWT_SECRET;
    if (isProd && !jwtSecret) {
      throw new Error('JWT_SECRET is required in production');
    }
    if (!jwtSecret) {
      jwtSecret = `dev-only-secret-${Math.random().toString(36).slice(2)}`;
      warnings.push('JWT_SECRET not set; generated ephemeral secret for dev');
    }

    const botSharedSecret = env.BOT_SHARED_SECRET;
    if (isProd && !botSharedSecret) {
      throw new Error('BOT_SHARED_SECRET is required in production');
    }

    const corsOrigins = env.CORS_ORIGINS
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    return {
      nodeEnv: env.NODE_ENV,
      isProd,
      port: env.PORT,
      logLevel: env.LOG_LEVEL,
      dbPath: env.DB_PATH,
      botPath: env.BOT_PATH,
      botUsername: env.BOT_USERNAME,
      jwtSecret,
      botSharedSecret,
      corsOrigins,
      version: '0.1.0',
      poeClientId: env.POE_CLIENT_ID,
      poeClientSecret: env.POE_CLIENT_SECRET,
      poeRedirectUri: env.POE_REDIRECT_URI,
      poeEncryptionKey: env.POE_TOKEN_ENCRYPTION_KEY,
      warnings,
    };
  });

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.format());
  throw new Error('Invalid environment configuration');
}

export const config = parsed.data;
