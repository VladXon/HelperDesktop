import { net } from 'electron';
import type { GggTransport, GggRequest, GggResponse, CookieProvider } from '../types';

const BASE = 'https://www.pathofexile.com';

function buildUrl(req: GggRequest): string {
  const url = `${BASE}${req.path}`;
  if (!req.params || Object.keys(req.params).length === 0) return url;
  const qs = new URLSearchParams(req.params).toString();
  return `${url}?${qs}`;
}

export const electronNetRequestSessionTransport: GggTransport = {
  id: 'electron-net-request-session',
  version: '1.0',
  description: 'Electron net.request() with useSessionCookies:true — Chromium handles cookies + CF natively',

  async execute(req: GggRequest, cookieProvider: CookieProvider): Promise<GggResponse> {
    const extraHeaders = await cookieProvider.prepare(this);
    try {
      const url = buildUrl(req);

      return new Promise((resolve, reject) => {
        const start = performance.now();
        const request = net.request({
          method: req.method,
          url,
          useSessionCookies: true,
        });

        request.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36');
        request.setHeader('Accept', 'application/json, text/plain, */*');
        for (const [k, v] of Object.entries(extraHeaders)) {
          request.setHeader(k, v);
        }
        if (req.headers) {
          for (const [k, v] of Object.entries(req.headers)) {
            request.setHeader(k, v);
          }
        }

        let body = '';
        let resHeaders: Record<string, string> = {};

        request.on('response', (res) => {
          for (const [k, v] of Object.entries(res.headers)) {
            const val = Array.isArray(v) ? v.join(', ') : v;
            resHeaders[k] = val;
          }
          res.on('data', (chunk) => { body += chunk.toString(); });
          res.on('end', () => {
            const end = performance.now();
            resolve({
              status: res.statusCode ?? 0,
              headers: resHeaders,
              body,
              timingMs: { start, end, duration: end - start },
            });
          });
          res.on('error', (err) => reject(err));
        });

        request.on('error', (err) => reject(err));

        if (req.body) {
          const data = JSON.stringify(req.body);
          request.setHeader('Content-Type', 'application/json');
          request.write(data);
        }

        request.end();
      });
    } finally {
      await cookieProvider.cleanup(this);
    }
  },
};
