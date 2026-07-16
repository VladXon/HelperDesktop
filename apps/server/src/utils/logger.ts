import { AsyncLocalStorage } from 'node:async_hooks';
import { mkdirSync, appendFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../config.js';

export const LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;
export type Level = (typeof LEVELS)[number];

const LEVEL_RANK: Record<Level, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

export const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'refreshToken',
  'refresh_token',
  'accessToken',
  'access_token',
  'authorization',
  'x-bot-secret',
  'xAuthLogin',
  'xAuthPassword',
]);

const requestIdStack = new AsyncLocalStorage<string>();

export function getRequestId(): string | undefined {
  return requestIdStack.getStore();
}

export function runWithRequestId<T>(id: string, fn: () => T): T {
  return requestIdStack.run(id, fn);
}

const ANSI = {
  reset: '\x1b[0m',
  gray: '\x1b[90m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
} as const;

const LEVEL_COLOR: Record<Level, string> = {
  trace: ANSI.gray,
  debug: ANSI.cyan,
  info: ANSI.cyan,
  warn: ANSI.yellow,
  error: ANSI.red,
  fatal: `${ANSI.bold}${ANSI.red}`,
};

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function maskSensitive(input: unknown, keys: Set<string> = SENSITIVE_KEYS): unknown {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) return input.map((v) => maskSensitive(v, keys));
  if (typeof input !== 'object') return input;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (keys.has(k)) {
      out[k] = '***';
    } else {
      out[k] = maskSensitive(v, keys);
    }
  }
  return out;
}

function ensureLogsDir(): void {
  if (!config.isProd) return;
  const dir = join(process.cwd(), 'logs');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function writeFile(level: Level, line: string): void {
  if (!config.isProd) return;
  ensureLogsDir();
  const file = level === 'error' || level === 'fatal' ? 'error' : 'app';
  const path = join(process.cwd(), 'logs', `${file}-${todayKey()}.log`);
  appendFileSync(path, line + '\n', 'utf8');
}

function formatLine(level: Level, scope: string, message: string, meta?: unknown): string {
  const ts = new Date().toISOString();
  const reqId = getRequestId();
  if (config.isProd) {
    const payload = {
      ts,
      level,
      scope,
      requestId: reqId,
      message,
      ...(meta !== undefined ? { meta: maskSensitive(meta) } : {}),
    };
    return JSON.stringify(payload);
  }
  const color = LEVEL_COLOR[level];
  const reset = ANSI.reset;
  const gray = ANSI.gray;
  const reqIdStr = reqId ? ` ${gray}[${reqId.slice(0, 8)}]${reset}` : '';
  const metaStr = meta !== undefined ? ` ${gray}${JSON.stringify(maskSensitive(meta))}${reset}` : '';
  return `${gray}${ts}${reset}${reqIdStr} ${color}${level.toUpperCase().padEnd(5)}${reset} ${scope}: ${message}${metaStr}`;
}

export class Logger {
  private minRank: number;

  constructor(minLevel: Level = config.logLevel) {
    this.minRank = LEVEL_RANK[minLevel];
  }

  private log(level: Level, scope: string, message: string, meta?: unknown): void {
    if (LEVEL_RANK[level] < this.minRank) return;
    const line = formatLine(level, scope, message, meta);
    if (level === 'error' || level === 'fatal') {
      process.stderr.write(line + '\n');
    } else {
      process.stdout.write(line + '\n');
    }
    writeFile(level, line);
  }

  trace(scope: string, message: string, meta?: unknown): void {
    this.log('trace', scope, message, meta);
  }
  debug(scope: string, message: string, meta?: unknown): void {
    this.log('debug', scope, message, meta);
  }
  info(scope: string, message: string, meta?: unknown): void {
    this.log('info', scope, message, meta);
  }
  warn(scope: string, message: string, meta?: unknown): void {
    this.log('warn', scope, message, meta);
  }
  error(scope: string, message: string, meta?: unknown): void {
    this.log('error', scope, message, meta);
  }
  fatal(scope: string, message: string, meta?: unknown): void {
    this.log('fatal', scope, message, meta);
  }

  child(_scope: string): Logger {
    return this;
  }
}

export const logger = new Logger();

export const log = {
  startup: (msg: string, meta?: unknown) => logger.info('startup', msg, meta),
  shutdown: (msg: string, meta?: unknown) => logger.info('shutdown', msg, meta),
  db: (msg: string, meta?: unknown) => logger.info('db', msg, meta),
  auth: (msg: string, meta?: unknown) => logger.info('auth', msg, meta),
  security: (msg: string, meta?: unknown) => logger.warn('security', msg, meta),
  websocket: (msg: string, meta?: unknown) => logger.info('websocket', msg, meta),
  bot: (msg: string, meta?: unknown) => logger.info('bot', msg, meta),
  request: (msg: string, meta?: unknown) => logger.info('http', msg, meta),
  requestError: (msg: string, meta?: unknown) => logger.error('http', msg, meta),
};

export { maskSensitive as mask };
