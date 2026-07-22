import { FALLBACK_CATEGORIES } from './authenticator';
import type { IGggAuthenticator, GggAuthHeaders, AuthAttemptLog, ValidationResult, TransportSelection, PartitionInfo } from './authenticator';

/**
 * Цепочка: пробует authenticators по порядку.
 *
 * Fallback-логика с трейсингом:
 *   Каждый шаг логирует: requestedAuthenticator, selectedTransport, fallbackAttempted, fallbackReason.
 *   Продолжаем перебор ТОЛЬКО при: session_expired, cloudflare_block, network_error.
 */
export class FallbackChainAuthenticator implements IGggAuthenticator {
  readonly id = 'fallback-chain';
  readonly description = 'Auto-fallback: session → poesessid → browserwindow';
  readonly authType = 'session' as const;

  private chain: IGggAuthenticator[];
  private lastSuccessfulId: string | null = null;

  constructor(authenticators: IGggAuthenticator[]) {
    this.chain = authenticators;
  }

  getPartitionInfo(): PartitionInfo | null {
    return this.chain[0]?.getPartitionInfo() ?? null;
  }

  async authenticate(): Promise<GggAuthHeaders> {
    if (this.lastSuccessfulId) {
      const cached = this.chain.find((a) => a.id === this.lastSuccessfulId);
      if (cached) {
        const vr = await cached.validate();
        if (vr.valid) return cached.authenticate();
      }
      this.lastSuccessfulId = null;
    }

    for (let i = 0; i < this.chain.length; i++) {
      const auth = this.chain[i]!;
      console.log(`[PoeAuth] FallbackChain: trying ${auth.id}...`);

      const vr = await auth.validate();

      if (vr.valid) {
        console.log(`[PoeAuth] FallbackChain: ✓ ${auth.id} selected: ${vr.transportSelection.selectedTransport}`);
        console.log(`[PoeAuth] FallbackChain:   reason: ${vr.transportSelection.fallbackAttempted ? `fallback from previous (${vr.transportSelection.fallbackReason})` : 'primary'}`);
        this.lastSuccessfulId = auth.id;
        return auth.authenticate();
      }

      const fbMsg = vr.transportSelection.fallbackReason ?? vr.errorCategory ?? 'unknown';
      console.log(`[PoeAuth] FallbackChain: ✗ ${auth.id} failed: ${fbMsg} (transport: ${vr.transportSelection.selectedTransport})`);

      if (vr.errorCategory === null) {
        console.log(`[PoeAuth] FallbackChain: ⏭ ${auth.id} skipped: not configured`);
        continue;
      }

      if (!FALLBACK_CATEGORIES.includes(vr.errorCategory)) {
        console.log(`[PoeAuth] FallbackChain: ✗ ${vr.errorCategory} is not fallbackable — stopping chain`);
        throw Object.assign(new Error(vr.errorMessage ?? 'Authentication failed'), {
          code: vr.errorCategory ?? 'auth_failed',
        });
      }

      console.log(`[PoeAuth] FallbackChain: → falling back to next authenticator (${i + 1 < this.chain.length ? this.chain[i + 1]!.id : 'NONE'})`);
    }

    throw Object.assign(new Error('All authentication methods failed'), { code: 'auth_all_failed' });
  }

  async validate(): Promise<ValidationResult> {
    try {
      const headers = await this.authenticate();
      return {
        valid: true,
        accountName: headers.accountName,
        errorCategory: null,
        errorMessage: null,
        transportSelection: {
          requestedAuthenticator: this.id,
          selectedTransport: this.lastSuccessfulId ?? 'unknown',
          selected: true,
          fallbackAttempted: this.lastSuccessfulId !== this.chain[0]?.id,
          fallbackReason: this.lastSuccessfulId !== this.chain[0]?.id ? `fell back to ${this.lastSuccessfulId}` : null,
        },
      };
    } catch (err) {
      return {
        valid: false,
        errorCategory: (err as { code?: string }).code as ValidationResult['errorCategory'] ?? 'ggg_unavailable',
        errorMessage: (err as Error).message,
        transportSelection: {
          requestedAuthenticator: this.id,
          selectedTransport: 'none',
          selected: false,
          fallbackAttempted: true,
          fallbackReason: (err as Error).message,
        },
      };
    }
  }

  async getAccountName(): Promise<string | null> {
    try { const headers = await this.authenticate(); return headers.accountName ?? null; } catch { return null; }
  }

  async invalidate(): Promise<void> {
    for (const auth of this.chain) { await auth.invalidate().catch(() => {}); }
    this.lastSuccessfulId = null;
  }

  getAttemptLogs(): AuthAttemptLog[] { return this.chain.flatMap((a) => a.getAttemptLogs()); }

  getLastSuccessfulId(): string | null { return this.lastSuccessfulId; }
}
