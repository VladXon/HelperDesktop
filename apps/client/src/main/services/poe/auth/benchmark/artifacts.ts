import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { AuthBenchmarkResult, GggRequest, GggResponse } from './types';

const ARTIFACTS_DIR = join(process.cwd(), 'benchmarks');

function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

function timestampDir(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}-${min}`;
}

export interface HarArtifact {
  request: {
    path: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
  };
  response: {
    status: number;
    headers: Record<string, string>;
    body: string;
    timingMs: { start: number; end: number; duration: number };
  };
  meta: {
    transportId: string;
    transportVersion: string;
    cookieProviderId: string;
    createdAt: string;
  };
}

export function saveArtifact(
  transportId: string,
  request: GggRequest,
  response: GggResponse,
  cookieProviderId: string,
): string {
  const ts = timestampDir();
  const dir = join(ARTIFACTS_DIR, ts, transportId);
  ensureDir(dir);

  const filename = `${Date.now()}-${request.path.replace(/[/?&=:]/g, '_')}.json`;
  const filepath = join(dir, filename);

  const har: HarArtifact = {
    request: {
      path: request.path,
      method: request.method,
      headers: maskSensitiveHeaders(request.headers ?? {}),
      body: request.body ? JSON.stringify(request.body) : undefined,
    },
    response: {
      status: response.status,
      headers: response.headers,
      body: response.body.slice(0, 100_000), // cap at 100KB
      timingMs: response.timingMs,
    },
    meta: {
      transportId,
      transportVersion: '1.0',
      cookieProviderId,
      createdAt: new Date().toISOString(),
    },
  };

  writeFileSync(filepath, JSON.stringify(har, null, 2), 'utf-8');
  return filepath;
}

function maskSensitiveHeaders(headers: Record<string, string>): Record<string, string> {
  const m: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    const kl = k.toLowerCase();
    if (kl === 'cookie' || kl === 'authorization' || kl === 'poesessid') {
      m[k] = '[REDACTED]';
    } else {
      m[k] = v;
    }
  }
  return m;
}

export function getArtifactsDir(): string {
  return ARTIFACTS_DIR;
}
