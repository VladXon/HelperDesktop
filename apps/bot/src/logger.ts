const LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;
type Level = (typeof LEVELS)[number];

const LEVEL_RANK: Record<Level, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

const ANSI = {
  reset: '\x1b[0m',
  gray: '\x1b[90m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
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

export class BotLogger {
  private readonly minRank: number;
  private readonly isProd: boolean;

  constructor(minLevel: Level = 'info', isProd = false) {
    this.minRank = LEVEL_RANK[minLevel];
    this.isProd = isProd;
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

  private log(level: Level, scope: string, message: string, meta?: unknown): void {
    if (LEVEL_RANK[level] < this.minRank) return;
    const ts = new Date().toISOString();
    const line = this.isProd
      ? JSON.stringify({ ts, level, scope, message, ...(meta !== undefined ? { meta } : {}) })
      : `${ANSI.gray}${ts}${ANSI.reset} ${LEVEL_COLOR[level]}${level.toUpperCase().padEnd(5)}${ANSI.reset} ${scope}: ${message}${
          meta !== undefined ? ` ${ANSI.gray}${JSON.stringify(meta)}${ANSI.reset}` : ''
        }`;
    if (level === 'error' || level === 'fatal') {
      process.stderr.write(line + '\n');
    } else {
      process.stdout.write(line + '\n');
    }
  }
}

export const logger = new BotLogger();

export const log = {
  startup: (msg: string, meta?: unknown) => logger.info('startup', msg, meta),
  shutdown: (msg: string, meta?: unknown) => logger.info('shutdown', msg, meta),
  security: (msg: string, meta?: unknown) => logger.warn('security', msg, meta),
  bot: (msg: string, meta?: unknown) => logger.info('bot', msg, meta),
  api: (msg: string, meta?: unknown) => logger.info('api', msg, meta),
  poller: (msg: string, meta?: unknown) => logger.info('poller', msg, meta),
  info: (msg: string, meta?: unknown) => logger.info('app', msg, meta),
  error: (msg: string, meta?: unknown) => logger.error('app', msg, meta),
};
