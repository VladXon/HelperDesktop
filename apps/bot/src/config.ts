import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

const DEFAULT_SERVER_URL = 'http://localhost:3001';
const DEFAULT_LOG_LEVEL = 'info' as const;
const DEFAULT_POLL_INTERVAL_MS = 30_000;
const DEFAULT_DB_PATH = '../server/helperdesktop.db';
const LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;

const configFileSchema = z.object({
  token: z.string().min(1),
  botUsername: z.string().optional(),
  serverUrl: z.string().url().optional(),
});

export interface BotConfig {
  token: string;
  botUsername: string;
  serverUrl: string;
  sharedSecret: string;
  logLevel: (typeof LOG_LEVELS)[number];
  pollIntervalMs: number;
  dbPath: string;
  isManaged: boolean;
  warnings: string[];
}

function loadConfigFile(): { token?: string; botUsername?: string; serverUrl?: string } {
  const candidates = [
    join(process.cwd(), 'bot-config.json'),
    join(process.cwd(), '..', 'bot', 'bot-config.json'),
    join(import.meta.dirname ?? process.cwd(), 'bot-config.json'),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    try {
      const raw = readFileSync(path, 'utf8');
      const parsed = configFileSchema.safeParse(JSON.parse(raw));
      if (parsed.success) {
        return parsed.data;
      }
    } catch {
      // ignore
    }
  }
  return {};
}

function parseInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function loadConfig(overrides: NodeJS.ProcessEnv = process.env): BotConfig {
  const fromFile = loadConfigFile();
  const token = overrides.BOT_TOKEN ?? fromFile.token ?? '';
  const botUsername = overrides.BOT_USERNAME ?? fromFile.botUsername ?? '';
  const serverUrl = overrides.SERVER_URL ?? fromFile.serverUrl ?? DEFAULT_SERVER_URL;
  const sharedSecret = overrides.BOT_SHARED_SECRET ?? '';
  const rawLevel = overrides.LOG_LEVEL ?? DEFAULT_LOG_LEVEL;
  const logLevel = (LOG_LEVELS as readonly string[]).includes(rawLevel)
    ? (rawLevel as (typeof LOG_LEVELS)[number])
    : DEFAULT_LOG_LEVEL;
  const pollIntervalMs = parseInteger(overrides.POLL_INTERVAL_MS, DEFAULT_POLL_INTERVAL_MS);
  const dbPath = overrides.DB_PATH ?? DEFAULT_DB_PATH;
  const isManaged = overrides.BOT_MANAGED === '1';

  const warnings: string[] = [];
  if (!token) {
    warnings.push('BOT_TOKEN is not set; bot will fail to start');
  }
  if (!sharedSecret) {
    warnings.push('BOT_SHARED_SECRET is not set; server requests will be rejected with 401');
  }
  if (isManaged) {
    warnings.push('bot is managed by server BotManager; do not run directly in production');
  }

  return {
    token,
    botUsername,
    serverUrl,
    sharedSecret,
    logLevel,
    pollIntervalMs,
    dbPath,
    isManaged,
    warnings,
  };
}
