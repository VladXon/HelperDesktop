import { BrowserWindow } from 'electron';
import type { IGggAuthenticator, GggAuthHeaders, AuthAttemptLog, ValidationResult, ErrorCategory, TransportSelection, PartitionInfo } from './authenticator';

const GGG_BASE = 'https://www.pathofexile.com';

export class BrowserWindowAuthenticator implements IGggAuthenticator {
  readonly id = 'browserwindow-execjs';
  readonly description = 'Hidden BrowserWindow — CF bypass, expensive (~3-5s)';
  readonly authType = 'session' as const;

  private attempts: AuthAttemptLog[] = [];
  private poesessid: string | null = null;
  private accountName: string | null = null;

  constructor(poesessid?: string) {
    if (poesessid) this.poesessid = poesessid;
  }

  getPartitionInfo(): PartitionInfo | null { return null; }

  setPoesessid(poesessid: string): void {
    this.poesessid = poesessid;
    this.accountName = null;
  }

  async authenticate(): Promise<GggAuthHeaders> {
    if (!this.poesessid) {
      throw Object.assign(new Error('POESESSID not configured'), { code: 'no_poesessid' });
    }
    return {
      headers: { 'Cookie': `POESESSID=${this.poesessid}` },
      accountName: this.accountName ?? undefined,
      authType: 'session',
    };
  }

  async validate(): Promise<ValidationResult> {
    const transportSelection: TransportSelection = {
      requestedAuthenticator: this.id,
      selectedTransport: 'BrowserWindow+executeJS',
      selected: !!this.poesessid,
      fallbackAttempted: false,
      fallbackReason: this.poesessid ? null : 'no_poesessid',
    };

    if (!this.poesessid) {
      return { valid: false, errorCategory: null, errorMessage: 'POESESSID not configured', transportSelection };
    }

    const t0 = performance.now();
    const win = new BrowserWindow({
      width: 1024, height: 768, show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });

    let statusCode: number | null = null;
    let cfDetected = false;
    let errorCategory: ErrorCategory = null;
    let fallbackUsed: string | null = null;

    try {
      await win.webContents.session.clearStorageData({ storages: ['cookies'] });
      await win.webContents.session.cookies.set({
        url: GGG_BASE, name: 'POESESSID', value: this.poesessid,
        domain: '.pathofexile.com', path: '/', secure: true, sameSite: 'lax',
      });

      await win.loadURL(`${GGG_BASE}/api/leagues?type=main`);

      await new Promise<void>((resolve, reject) => {
        let finished = false;
        const timeout = setTimeout(() => { if (!finished) { finished = true; resolve(); } }, 25_000);
        win.webContents.on('did-finish-load', () => { if (!finished) { finished = true; clearTimeout(timeout); resolve(); } });
        win.webContents.on('did-fail-load', (_e, code, _desc, _url, isMainFrame) => {
          if (!isMainFrame || code === -3) return;
          if (!finished) { finished = true; clearTimeout(timeout); reject(new Error(`Page load: ${code}`)); }
        });
      });

      await new Promise((r) => setTimeout(r, 3000));

      const result = await win.webContents.executeJavaScript(`
        (async () => {
          try {
            const res = await fetch('${GGG_BASE}/character-window/get-account-name', {
              headers: { 'Accept': 'application/json, text/plain, */*' }, credentials: 'include',
            });
            const ct = res.headers.get('content-type') || '';
            const text = await res.text();
            let json = null; try { json = JSON.parse(text); } catch {}
            return { ok: true, status: res.status, body: text, isJson: ct.includes('application/json'), data: json };
          } catch (e) { return { ok: false, error: String(e) }; }
        })()
      `) as { ok: boolean; status?: number; body?: string; isJson?: boolean; data?: { name?: string }; error?: string };

      statusCode = result.status ?? null;
      cfDetected = (result.body ?? '').includes('Cloudflare') || (result.body ?? '').includes('Just a moment');

      if (result.ok && result.status === 200 && result.data?.name) {
        this.accountName = result.data.name;
        this.logAttempt('get-account-name', true, 200, performance.now() - t0, cfDetected, null, fallbackUsed);
        return { valid: true, accountName: result.data.name, errorCategory: null, errorMessage: null, transportSelection };
      }

      errorCategory = cfDetected ? 'cloudflare_block'
        : statusCode === 401 || statusCode === 403 ? 'session_expired'
        : statusCode === 429 ? 'rate_limited'
        : statusCode === 404 ? 'invalid_params'
        : 'ggg_unavailable';

      this.logAttempt('get-account-name', false, statusCode, performance.now() - t0, cfDetected, errorCategory, fallbackUsed);
      return { valid: false, errorCategory, errorMessage: `BrowserWindow returned ${statusCode}`, transportSelection };
    } catch (err) {
      this.logAttempt('get-account-name', false, null, performance.now() - t0, false, 'network_error', fallbackUsed);
      return { valid: false, errorCategory: 'network_error', errorMessage: (err as Error).message, transportSelection };
    } finally {
      win.destroy();
    }
  }

  async getAccountName(): Promise<string | null> {
    if (this.accountName) return this.accountName;
    const result = await this.validate();
    return result.valid ? (result.accountName ?? null) : null;
  }

  async invalidate(): Promise<void> {
    this.poesessid = null;
    this.accountName = null;
    this.attempts = [];
  }

  getAttemptLogs(): AuthAttemptLog[] { return [...this.attempts]; }

  private logAttempt(
    endpoint: string, success: boolean, statusCode: number | null,
    latencyMs: number, cfDetected: boolean, errorCategory: ErrorCategory, fallbackUsed: string | null,
  ): void {
    this.attempts.push({
      authenticatorId: this.id, transport: 'BrowserWindow+executeJS', endpoint, success,
      latencyMs: Math.round(latencyMs), statusCode, cloudflareDetected: cfDetected,
      fallbackUsed, errorCategory, timestamp: new Date().toISOString(),
    });
  }
}
