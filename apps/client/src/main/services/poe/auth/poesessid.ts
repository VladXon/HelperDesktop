import { net } from 'electron';
import type { IGggAuthenticator, GggAuthHeaders, AuthAttemptLog, ValidationResult, ErrorCategory, TransportSelection, PartitionInfo } from './authenticator';

const GGG_API = 'https://www.pathofexile.com';
const VALIDATION_ENDPOINT = '/character-window/get-account-name';

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

      if (res.status === 200) {
        try {
          const data = JSON.parse(body);
          if (data?.name) {
            this.accountName = data.name;
            this.logAttempt(VALIDATION_ENDPOINT, true, 200, performance.now() - t0, false, null, null);
            return { valid: true, accountName: data.name, errorCategory: null, errorMessage: null, transportSelection };
          }
        } catch { /* not JSON */ }
      }

      errorCategory = cfDetected ? 'cloudflare_block'
        : res.status === 401 || res.status === 403 ? 'session_expired'
        : res.status === 429 ? 'rate_limited'
        : res.status === 404 ? 'invalid_params'
        : 'ggg_unavailable';

      this.logAttempt(VALIDATION_ENDPOINT, false, statusCode, performance.now() - t0, cfDetected, errorCategory, null);
      return { valid: false, errorCategory, errorMessage: `GGG returned ${statusCode}`, transportSelection };
    } catch (err) {
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
