import { BrowserWindow, session as electronSession } from 'electron';
import type { IGggAuthenticator, GggAuthHeaders, AuthAttemptLog, ValidationResult, ErrorCategory, TransportSelection, PartitionInfo } from './authenticator';

const GGG_BASE = 'https://api.pathofexile.com';

/**
 * Cloudflare can return non-200 status codes when blocking requests.
 * These are NOT real GGG errors — they require CF bypass (BrowserWindow).
 */
function isLikelyCloudflareStatus(status: number | null): boolean {
  return status === 403 || status === 404 || status === 503;
}

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
      await win.webContents.session.cookies.set({
        url: GGG_BASE, name: 'POESESSID', value: this.poesessid,
        domain: '.pathofexile.com', path: '/', secure: true, sameSite: 'lax', httpOnly: true,
      });

      const targetUrl = `${GGG_BASE}/profile`;
      console.log(`[PoeAuth] BrowserWindowAuthenticator: loading ${targetUrl}`);

      const loadResult = await new Promise<{ error: string | null; body: string; status: number }>((resolve) => {
        let resolved = false;
        let resBody = '';
        let resStatus = 0;
        const done = (error: string | null) => { if (!resolved) { resolved = true; resolve({ error, body: resBody, status: resStatus }); } };

        const timer = setTimeout(() => done(null), 25_000);

        win.webContents.on('did-finish-load', () => { clearTimeout(timer); done(null); });
        win.webContents.on('did-fail-load', (_e, code, desc, url, isMainFrame) => {
          if (!isMainFrame || code === -3) return;
          const msg = `code=${code} desc="${desc}" url="${url}"`;
          console.log(`[PoeAuth] BrowserWindowAuthenticator: did-fail-load ${msg}`);
          clearTimeout(timer);
          done(msg);
        });

        win.loadURL(targetUrl).catch((err) => {
          const msg = `loadURL threw: ${(err as Error).message}`;
          console.log(`[PoeAuth] BrowserWindowAuthenticator: ${msg}`);
          clearTimeout(timer);
          done(msg);
        });
      });

      if (loadResult.error) {
        console.log(`[PoeAuth] BrowserWindowAuthenticator: ✗ page load failed: ${loadResult.error}`);
        this.logAttempt('profile', false, null, performance.now() - t0, false, 'network_error', fallbackUsed);
        return { valid: false, errorCategory: 'network_error', errorMessage: loadResult.error, transportSelection };
      }

      statusCode = loadResult.status || 200;
      const body = loadResult.body;
      cfDetected = body.includes('Cloudflare') || body.includes('Just a moment');

      let data: { name?: string } | null = null;
      try { data = JSON.parse(body); } catch { /* not JSON */ }

      if (statusCode === 200 && data?.name) {
        this.accountName = data.name;

        await this.propagateSessionCookie();

        console.log(`[PoeAuth] BrowserWindowAuthenticator: ✓ validated (account=${data.name})`);
        this.logAttempt('profile', true, 200, performance.now() - t0, cfDetected, null, fallbackUsed);
        return { valid: true, accountName: data.name, errorCategory: null, errorMessage: null, transportSelection };
      }

      const isGggJson = data != null;

      errorCategory = cfDetected ? 'cloudflare_block'
        : statusCode === 429 ? 'rate_limited'
        : isGggJson ? 'session_expired'
        : isLikelyCloudflareStatus(statusCode) ? 'cloudflare_block'
        : 'session_expired';

      console.log(`[PoeAuth] BrowserWindowAuthenticator: ✗ failed (status=${statusCode}, error=${errorCategory}, isGggJson=${isGggJson})`);
      this.logAttempt('profile', false, statusCode, performance.now() - t0, cfDetected, errorCategory, fallbackUsed);
      return { valid: false, errorCategory, errorMessage: `BrowserWindow returned ${statusCode}`, transportSelection };
    } catch (err) {
      const errMsg = (err as Error).message;
      console.log(`[PoeAuth] BrowserWindowAuthenticator: ✗ unexpected error: ${errMsg}`);
      this.logAttempt('get-account-name', false, null, performance.now() - t0, false, 'network_error', fallbackUsed);
      return { valid: false, errorCategory: 'network_error', errorMessage: errMsg, transportSelection };
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

  /**
   * Propagate POESESSID to Chromium default session.
   * This allows DefaultSessionAuthenticator to use the cookie for subsequent requests.
   */
  private async propagateSessionCookie(): Promise<void> {
    if (!this.poesessid) return;
    try {
      await electronSession.defaultSession.cookies.set({
        url: GGG_BASE,
        name: 'POESESSID',
        value: this.poesessid,
        domain: '.pathofexile.com',
        path: '/',
        secure: true,
        sameSite: 'lax',
        httpOnly: true,
      });
    } catch {
      // Best-effort — don't fail validation if cookie propagation fails
    }
  }

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
