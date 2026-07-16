import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { runWithRequestId } from '../utils/logger.js';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: { id: number; login: string; name: string; email: string; isDev: boolean; createdAt: string };
    }
  }
}

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
  req.requestId = id;
  res.setHeader('x-request-id', id);
  runWithRequestId(id, () => {
    next();
  });
}
