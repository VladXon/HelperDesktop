import { net } from 'electron';
import type { IGggAuthenticator, GggAuthHeaders, AuthAttemptLog, ValidationResult, ErrorCategory, TransportSelection, PartitionInfo } from './authenticator';

const GGG_API = 'https://api.pathofexile.com';
const VALIDATION_ENDPOINT = '/profile';

/**
 * Cloudflare can return non-200 status codes when blocking requests.
 * These are NOT real GGG errors — they require CF bypass (BrowserWindow).
 */
function isLikelyCloudflareStatus(status: number): boolean {
  return status === 403 || status === 404 || status === 503;
}

export class PoesessidAuthenticator implements IGggAuthenticator {
  readonly id = 'poesessid-header';
  readonly description = 'POESESSID in Cookie header via net.fetch';
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

  getPoesessid(): string | null { return this.poesessid; }

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
      selectedTransport: 'net.fetch+Cookie',
      selected: !!this.poesessid,
      fallbackAttempted: false,
      fallbackReason: this.poesessid ? null : 'no_poesessid',
    };

    if (!this.poesessid) {
      return { valid: false, errorCategory: null, errorMessage: 'POESESSID not configured', transportSelection };
    }

    const t0 = performance.now();
    let statusCode: number | null = null;
    let cfDetected = false;
    let errorCategory: ErrorCategory = null;

    try {
      const url = `${GGG_API}${VALIDATION_ENDPOINT}`;
      console.log(`[PoeAuth] PoesessidAuthenticator: validating via net.fetch (raw HTTP without Chromium session)`);
      const res = await net.fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Cookie': `POESESSID=${this.poesessid}`,
        },
      });

      statusCode = res.status;
      const body = await res.text();
      cfDetected = body.includes('Cloudflare') || body.includes('Just a moment');

      if (cfDetected) {
        console.log(`[PoeAuth] PoesessidAuthenticator: Cloudflare detected (status=${statusCode}) — raw HTTP blocked, need BrowserWindow`);
      }

      if (res.status === 200) {
        try {
          const data = JSON.parse(body);
          if (data?.name) {
            this.accountName = data.name;
            this.logAttempt(VALIDATION_ENDPOINT, true, 200, performance.now() - t0, false, null, null);
            console.log(`[PoeAuth] PoesessidAuthenticator: ✓ validated (account=${data.name})`);
            return { valid: true, accountName: data.name, errorCategory: null, errorMessage: null, transportSelection };
          }
        } catch { /* not JSON */ }
      }

      let isGggJson = false;
      if (body) {
        try { const p = JSON.parse(body); if (p && (p.error || p.name)) isGggJson = true; } catch { /* not json */ }
      }

      errorCategory = cfDetected ? 'cloudflare_block'
        : statusCode === 429 ? 'rate_limited'
        : isGggJson ? 'session_expired'
        : isLikelyCloudflareStatus(statusCode) ? 'cloudflare_block'
        : 'session_expired';

      console.log(`[PoeAuth] PoesessidAuthenticator: ✗ failed (status=${statusCode}, error=${errorCategory}, isGggJson=${isGggJson})`);
      this.logAttempt(VALIDATION_ENDPOINT, false, statusCode, performance.now() - t0, cfDetected, errorCategory, null);
      return { valid: false, errorCategory, errorMessage: `GGG returned ${statusCode}`, transportSelection };
    } catch (err) {
      console.log(`[PoeAuth] PoesessidAuthenticator: ✗ network error: ${(err as Error).message}`);
      this.logAttempt(VALIDATION_ENDPOINT, false, null, performance.now() - t0, false, 'network_error', null);
      return { valid: false, errorCategory: 'network_error', errorMessage: (err as Error).message, transportSelection };
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
      authenticatorId: this.id, transport: 'net.fetch+Cookie', endpoint, success,
      latencyMs: Math.round(latencyMs), statusCode, cloudflareDetected: cfDetected,
      fallbackUsed, errorCategory, timestamp: new Date().toISOString(),
    });
  }
}
