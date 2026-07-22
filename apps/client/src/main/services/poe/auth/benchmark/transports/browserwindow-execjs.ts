import { BrowserWindow } from 'electron';
import type { GggTransport, GggRequest, GggResponse, CookieProvider } from '../types';

const BASE = 'https://www.pathofexile.com';

export const browserWindowExecJsTransport: GggTransport = {
  id: 'browserwindow-execjs',
  version: '1.0',
  description: 'Hidden BrowserWindow — load GGG page, wait for CF, inject fetch() via executeJavaScript',

  async execute(req: GggRequest, cookieProvider: CookieProvider): Promise<GggResponse> {
    const url = `${BASE}${req.path}`;
    const win = new BrowserWindow({
      width: 1024,
      height: 768,
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });

    const start = performance.now();

    try {
      await cookieProvider.prepare(this);

      await win.webContents.session.clearStorageData({ storages: ['cookies'] });
      await win.loadURL(`${BASE}/api/leagues?type=main`);

      await new Promise<void>((resolve, reject) => {
        let finished = false;
        const timeout = setTimeout(() => {
          if (!finished) { finished = true; resolve(); }
        }, 25_000);

        win.webContents.on('did-finish-load', () => {
          if (!finished) { finished = true; clearTimeout(timeout); resolve(); }
        });

        win.webContents.on('did-fail-load', (_e, code, desc, _validatedUrl, isMainFrame) => {
          if (!isMainFrame || code === -3) return;
          if (!finished) { finished = true; clearTimeout(timeout); reject(new Error(`Page load failed: ${code} ${desc}`)); }
        });
      });

      await new Promise((r) => setTimeout(r, 3000));

      const fetchScript = `
        (async () => {
          try {
            const res = await fetch(${JSON.stringify(url)}, {
              method: ${JSON.stringify(req.method)},
              headers: { 'Accept': 'application/json, text/plain, */*' },
              ${req.body ? `body: ${JSON.stringify(JSON.stringify(req.body))},` : ''}
              credentials: 'include',
            });
            const ct = res.headers.get('content-type') || '';
            const text = await res.text();
            const hdrs = {};
            res.headers.forEach((v, k) => { hdrs[k] = v; });
            return { ok: true, status: res.status, headers: hdrs, body: text, contentType: ct };
          } catch (e) {
            return { ok: false, error: String(e) };
          }
        })()
      `;

      const result = await win.webContents.executeJavaScript(fetchScript) as {
        ok: boolean; status?: number; headers?: Record<string, string>; body?: string; contentType?: string; error?: string;
      };

      if (!result.ok) throw new Error(`BrowserWindow fetch failed: ${result.error}`);

      const end = performance.now();

      return {
        status: result.status ?? 0,
        headers: result.headers ?? {},
        body: result.body ?? '',
        timingMs: { start, end, duration: end - start },
      };
    } finally {
      await cookieProvider.cleanup(this);
      win.destroy();
    }
  },
};
