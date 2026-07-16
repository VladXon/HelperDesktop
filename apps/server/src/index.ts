import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { log, logger } from './utils/logger.js';

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

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: config.version,
      db: 'ok',
    });
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'not_found', requestId: undefined });
  });

  app.use(
    (err: Error & { status?: number; statusCode?: number; type?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      const status = err.status ?? err.statusCode ?? 500;
      if (status >= 500) {
        logger.error('http', 'unhandled error', { error: err.message, stack: err.stack });
      } else {
        logger.debug('http', 'request error', { status, error: err.message });
      }
      res.status(status >= 500 ? 500 : status).json({
        error: status >= 500 ? 'internal_error' : (err.type ?? 'bad_request'),
      });
    },
  );

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
    server.close((err) => {
      if (err) {
        log.shutdown('server close error', { error: err.message });
        process.exit(1);
      }
      log.shutdown('clean exit');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`) {
  main().catch((err) => {
    logger.fatal('startup', 'fatal during bootstrap', { error: err.message, stack: err.stack });
    process.exit(1);
  });
}
