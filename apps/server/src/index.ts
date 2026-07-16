import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { log, logger } from './utils/logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestId } from './middleware/request-id.js';
import { globalRateLimit } from './middleware/rate-limit.js';
import { createAuthRouter } from './routes/auth.js';
import { createNotesRouter } from './routes/notes.js';
import { createPresetsRouter } from './routes/presets.js';
import { createSettingsRouter } from './routes/settings.js';
import { createTelegramRouter } from './routes/telegram.js';
import { createInternalRouter } from './routes/internal.js';
import { createDevRouter } from './routes/dev.js';
import { attachWebSocket } from './ws.js';
import { BotManager } from './services/bot-manager.js';
import './db/index.js';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  const isDev = !config.isProd;
  app.use(
    helmet({
      contentSecurityPolicy: isDev
        ? false
        : {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:'],
              connectSrc: ["'self'"],
            },
          },
      hsts: config.isProd
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
      frameguard: { action: 'deny' },
      noSniff: true,
    }),
  );

  app.use(
    cors({
      origin: config.corsOrigins.length > 0 ? config.corsOrigins : isDev ? true : false,
      credentials: false,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(requestId);
  app.use(globalRateLimit);

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: config.version,
      db: 'ok',
    });
  });

  app.use('/api/auth', createAuthRouter());
  app.use('/api/notes', createNotesRouter());
  app.use('/api/presets', createPresetsRouter());
  app.use('/api/settings', createSettingsRouter());
  app.use('/api/telegram', createTelegramRouter());
  app.use('/api/internal/bot', createInternalRouter());
  app.use('/api/dev', createDevRouter());

  app.use((req, res) => {
    res.status(404).json({ error: 'not_found', requestId: req.requestId });
  });

  app.use(errorHandler);

  return app;
}

async function main(): Promise<void> {
  const app = createApp();
  const startedAt = Date.now();

  const server = app.listen(config.port, () => {
    log.startup('server listening', {
      port: config.port,
      env: config.nodeEnv,
      version: config.version,
    });
  });

  attachWebSocket(server);

  const bot = new BotManager({
    botPath: config.botPath,
    serverUrl: `http://localhost:${config.port}`,
    isWindows: process.platform === 'win32',
  });
  bot.start();

  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.shutdown('signal received, closing', { signal, uptimeMs: Date.now() - startedAt });
    const timer = setTimeout(() => {
      log.shutdown('forced exit after timeout');
      process.exit(1);
    }, 10_000);
    timer.unref();
    void bot.stop().finally(() => {
      server.close((err) => {
        if (err) {
          log.shutdown('server close error', { error: err.message });
          process.exit(1);
        }
        log.shutdown('clean exit');
        process.exit(0);
      });
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const here = fileURLToPath(import.meta.url);
const argv1 = process.argv[1] ? resolve(process.argv[1]) : '';
const isMain = argv1 !== '' && here === argv1;

if (isMain || process.env.HELPER_SERVER_AUTOSTART === '1') {
  void main().catch((err) => {
    logger.fatal('startup', 'fatal during bootstrap', { error: err.message, stack: err.stack });
    process.exit(1);
  });
}
