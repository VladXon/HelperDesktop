import { net, session as electronSession } from 'electron';
import type { IGggAuthenticator, GggAuthHeaders, AuthAttemptLog, ValidationResult, ErrorCategory, TransportSelection, PartitionInfo } from './authenticator';

const GGG_API = 'https://api.pathofexile.com';
const VALIDATION_ENDPOINT = '/profile';

/**
 * Cloudflare can return non-200 status codes when blocking requests:
 * - 403: Forbidden (CF WAF rule)
 * - 404: Not Found (CF challenge page returned as 404)
 * - 503: Service Unavailable (CF rate limit / origin down)
 * These are NOT real GGG errors — they require CF bypass (BrowserWindow).
 */
function isLikelyCloudflareStatus(status: number): boolean {
  return status === 403 || status === 404 || status === 503;
}

/**
 * Primary authenticator — Chromium session с поддержкой multi-account изоляции.
 *
 * Партиционирование:
 *   - Без accountId: `session.defaultSession` — глобальная сессия (1 аккаунт)
 *   - С accountId:  `session.fromPartition('persist:poe-account-{accountId}')` — изолированная сессия
 *
 * Каждая партиция — отдельный Cookie SQLite-файл. Куки не пересекаются.
 * Переключение аккаунта = использование другой партиции.
 *
 * Cookie lifetime:
 *   POESESSID       ~30 дней бездействия
 *   cf_clearance    ~1 год после CF challenge
 *   __cf_bm         ~30 минут (сессионный, авто-обновление)
 *
 * Транспорт: `net.request({ useSessionCookies: true })`.
 * Cloudflare: Chromium решает CF-челленджи нативно.
 */
export class DefaultSessionAuthenticator implements IGggAuthenticator {
  readonly id = 'default-session';
  readonly description: string;
  readonly authType = 'session' as const;

  private readonly accountId: string | null;
  private attempts: AuthAttemptLog[] = [];
  private cachedAccountName: string | null = null;

  /** @param accountId — database PoE account id. null = defaultSession (single account). */
  constructor(accountId?: string | null) {
    this.accountId = accountId ?? null;
    this.description = accountId
      ? `Chromium partition persist:poe-account-${accountId} — isolated cookies, native CF`
      : 'Chromium defaultSession — global cookies, native CF';
  }

  getPartitionInfo(): PartitionInfo | null {
    return {
      partitionName: this.accountId ? `persist:poe-account-${this.accountId}` : 'defaultSession',
      isPersistent: true,
      accountId: this.accountId,
    };
  }

  /** Возвращает session для текущего аккаунта */
  private getSession() {
    if (this.accountId) {
      return electronSession.fromPartition(`persist:poe-account-${this.accountId}`);
    }
    return electronSession.defaultSession;
  }

  async authenticate(): Promise<GggAuthHeaders> {
    return {
      headers: {},
      accountName: this.cachedAccountName ?? undefined,
      authType: 'session',
    };
  }

  async validate(): Promise<ValidationResult> {
    const transportSelection: TransportSelection = {
      requestedAuthenticator: this.id,
      selectedTransport: 'net.request+useSessionCookies',
      selected: true,
      fallbackAttempted: false,
      fallbackReason: null,
    };

    const t0 = performance.now();
    let statusCode: number | null = null;
    let cfDetected = false;
    let errorCategory: ErrorCategory = null;

    try {
      console.log(`[PoeAuth] DefaultSessionAuthenticator: validating via Chromium session cookies`);
      const result = await this.makeRequest(VALIDATION_ENDPOINT);
      statusCode = result.status;
      cfDetected = result.cfDetected;

      if (cfDetected) {
        console.log(`[PoeAuth] DefaultSessionAuthenticator: Cloudflare detected (status=${statusCode}) — session may lack cf_clearance`);
      }

      if (result.status === 200 && result.body) {
        try {
          const data = JSON.parse(result.body);
          if (data?.name) {
            this.cachedAccountName = data.name;
            console.log(`[PoeAuth] DefaultSessionAuthenticator: ✓ validated (account=${data.name})`);
            this.logAttempt(VALIDATION_ENDPOINT, true, 200, performance.now() - t0, false, null, null);
            return {
              valid: true,
              accountName: data.name,
              errorCategory: null,
              errorMessage: null,
              transportSelection,
            };
          }
        } catch { /* not JSON */ }
      }

      let isGggJson = false;
      if (result.body) {
        try { const p = JSON.parse(result.body); if (p && (p.error || p.name)) isGggJson = true; } catch { /* not json */ }
      }

      errorCategory = cfDetected ? 'cloudflare_block'
        : result.status === 429 ? 'rate_limited'
        : isGggJson ? 'session_expired'
        : isLikelyCloudflareStatus(result.status) ? 'cloudflare_block'
        : 'session_expired';

      console.log(`[PoeAuth] DefaultSessionAuthenticator: ✗ failed (status=${statusCode}, error=${errorCategory}, isGggJson=${isGggJson})`);
      this.logAttempt(VALIDATION_ENDPOINT, false, result.status, performance.now() - t0, cfDetected, errorCategory, null);
      return { valid: false, errorCategory, errorMessage: `GGG returned ${result.status}`, transportSelection };
    } catch (err) {
      console.log(`[PoeAuth] DefaultSessionAuthenticator: ✗ network error: ${(err as Error).message}`);
      this.logAttempt(VALIDATION_ENDPOINT, false, null, performance.now() - t0, false, 'network_error', null);
      return { valid: false, errorCategory: 'network_error', errorMessage: (err as Error).message, transportSelection };
    }
  }

  async getAccountName(): Promise<string | null> {
    if (this.cachedAccountName) return this.cachedAccountName;
    const result = await this.validate();
    return result.valid ? (result.accountName ?? null) : null;
  }

  async invalidate(): Promise<void> {
    const ses = this.getSession();
    try {
      await ses.clearStorageData({ storages: ['cookies'], origin: GGG_API });
    } catch { /* best-effort */ }
    this.cachedAccountName = null;
    this.attempts = [];
  }

  getAttemptLogs(): AuthAttemptLog[] {
    return [...this.attempts];
  }

  makeRequest(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: unknown): Promise<{ status: number; body: string; cfDetected: boolean }> {
    return new Promise((resolve, reject) => {
      const url = `${GGG_API}${endpoint}`;
      const request = net.request({ method, url, useSessionCookies: true });

      request.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36');
      request.setHeader('Accept', 'application/json, text/plain, */*');

      let resBody = '';

      request.on('response', (res) => {
        res.on('data', (chunk) => { resBody += chunk.toString(); });
        res.on('end', () => {
          const cfDetected = resBody.includes('Cloudflare') || resBody.includes('Just a moment') || resBody.includes('cf-browser-verify');
          resolve({ status: res.statusCode ?? 0, body: resBody, cfDetected });
        });
        res.on('error', reject);
      });

      request.on('error', reject);

      if (body && method === 'POST') {
        request.setHeader('Content-Type', 'application/json');
        request.write(JSON.stringify(body));
      }

      request.end();
    });
  }

  private logAttempt(
    endpoint: string, success: boolean, statusCode: number | null,
    latencyMs: number, cfDetected: boolean, errorCategory: ErrorCategory, fallbackUsed: string | null,
  ): void {
    this.attempts.push({
      authenticatorId: this.id,
      transport: 'net.request+useSessionCookies',
      endpoint,
      success,
      latencyMs: Math.round(latencyMs),
      statusCode,
      cloudflareDetected: cfDetected,
      fallbackUsed,
      errorCategory,
      timestamp: new Date().toISOString(),
    });
  }
}
