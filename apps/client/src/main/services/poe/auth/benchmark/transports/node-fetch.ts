import type { GggTransport, GggRequest, GggResponse, CookieProvider } from '../types';

const BASE = 'https://www.pathofexile.com';

function buildUrl(req: GggRequest): string {
  const url = `${BASE}${req.path}`;
  if (!req.params || Object.keys(req.params).length === 0) return url;
  const qs = new URLSearchParams(req.params).toString();
  return `${url}?${qs}`;
}

export const nodeFetchTransport: GggTransport = {
  id: 'node-fetch',
  version: '1.0',
  description: 'Node.js global fetch() — simplest HTTP, no Electron deps',

  async execute(req: GggRequest, cookieProvider: CookieProvider): Promise<GggResponse> {
    const extraHeaders = await cookieProvider.prepare(this);
    try {
      const url = buildUrl(req);
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        ...extraHeaders,
      };
      if (req.headers) Object.assign(headers, req.headers);

      const start = performance.now();
      const res = await fetch(url, {
        method: req.method,
        headers,
        body: req.body ? JSON.stringify(req.body) : undefined,
      });
      const end = performance.now();

      const body = await res.text();
      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => { resHeaders[k] = v; });

      return { status: res.status, headers: resHeaders, body, timingMs: { start, end, duration: end - start } };
    } finally {
      await cookieProvider.cleanup(this);
    }
  },
};
