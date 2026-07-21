import type { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger.js';

export class HttpError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly expose: boolean;

  constructor(status: number, code: string, message?: string) {
    super(message ?? code);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.expose = status < 500;
  }
}

export function errorHandler(
  err: Error & { status?: number; statusCode?: number; type?: string; code?: string },
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status = err.status ?? err.statusCode ?? 500;
  if (status >= 500) {
    logger.error('http', 'unhandled error', {
      error: err.message,
      stack: err.stack,
      requestId: req.requestId,
    });
    res.status(status).json({ error: 'internal_error', requestId: req.requestId });
    return;
  }
  logger.debug('http', 'request error', { status, error: err.message, requestId: req.requestId });
  const code = (err as HttpError).code ?? err.type ?? 'bad_request';
  res.status(status).json({ error: code, message: err.message, requestId: req.requestId });
}
