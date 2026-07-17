import { CircuitBreaker, type CircuitBreakerOptions } from './circuit-breaker.js';

export interface ServerClientOptions {
  baseUrl: string;
  sharedSecret?: string;
  fetchImpl?: typeof fetch;
  maxRetries?: number;
  backoffMs?: readonly number[];
  retryOnStatuses?: readonly number[];
  sleep?: (ms: number) => Promise<void>;
  circuit?: Partial<CircuitBreakerOptions>;
}

export interface UserByTelegramId {
  user_id: number;
  login: string;
  is_dev: boolean;
}

export interface LinkByCodeResult {
  user_id: number;
  login: string;
}

export interface QrLoginSession {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface QrLoginResult {
  session: QrLoginSession;
}

export interface UnlinkResult {
  ok: true;
}

export interface HealthResult {
  status: string;
  timestamp: string;
  version: string;
  db: string;
}

export class ServerError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `server error ${status}`);
    this.name = 'ServerError';
    this.status = status;
    this.body = body;
  }
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BACKOFF: readonly number[] = [1000, 3000, 9000];
const DEFAULT_RETRY_STATUSES: readonly number[] = [502, 503, 504];
const DEFAULT_CIRCUIT: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeoutMs: 60_000,
};

export class ServerClient {
  private readonly baseUrl: string;
  private readonly sharedSecret: string;
  private readonly fetchImpl: typeof fetch;
  private readonly maxRetries: number;
  private readonly backoffMs: readonly number[];
  private readonly retryOnStatuses: ReadonlySet<number>;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly circuit: CircuitBreaker;

  constructor(opts: ServerClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.sharedSecret = opts.sharedSecret ?? process.env.BOT_SHARED_SECRET ?? '';
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.backoffMs = opts.backoffMs ?? DEFAULT_BACKOFF;
    this.retryOnStatuses = new Set<number>(opts.retryOnStatuses ?? DEFAULT_RETRY_STATUSES);
    this.sleep =
      opts.sleep ??
      ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.circuit = new CircuitBreaker({
      ...DEFAULT_CIRCUIT,
      ...opts.circuit,
      shouldCount: (err) => !(err instanceof ServerError && err.status < 500),
    });
  }

  circuitState(): 'closed' | 'open' | 'half-open' {
    return this.circuit.state();
  }

  async request<T = unknown>(
    path: string,
    options: { method?: string; body?: unknown; query?: Record<string, string | number | undefined> } = {},
  ): Promise<T> {
    const url = this.buildUrl(path, options.query);
    const method = options.method ?? 'GET';
    return this.circuit.execute(() => this.withRetry<T>(url, method, options.body));
  }

  async linkByCode(code: string, telegramId: number, idempotencyKey?: string): Promise<LinkByCodeResult> {
    return this.request<LinkByCodeResult>('/api/internal/bot/link-by-code', {
      method: 'POST',
      body: { code, telegramId, idempotencyKey },
    });
  }

  async userByTelegramId(telegramId: number): Promise<UserByTelegramId> {
    return this.request<UserByTelegramId>('/api/internal/bot/user-by-telegram-id', {
      method: 'GET',
      query: { telegramId },
    });
  }

  async approveQrLogin(token: string, telegramId: number, userId?: number): Promise<QrLoginResult> {
    return this.request<QrLoginResult>('/api/internal/bot/qr-login-approve', {
      method: 'POST',
      body: { token, telegramId, userId },
    });
  }

  async unlinkByTelegramId(telegramId: number): Promise<UnlinkResult> {
    return this.request<UnlinkResult>('/api/internal/bot/unlink-by-telegram-id', {
      method: 'POST',
      body: { telegramId },
    });
  }

  async markReminderSent(ids: number[]): Promise<void> {
    await this.request('/api/internal/bot/mark-reminder-sent', {
      method: 'POST',
      body: { ids },
    });
  }

  async markNotified(ids: number[]): Promise<void> {
    await this.request('/api/internal/bot/mark-notified', {
      method: 'POST',
      body: { ids },
    });
  }

  async markRead(id: number): Promise<void> {
    await this.request('/api/internal/bot/mark-read', {
      method: 'POST',
      body: { id },
    });
  }

  async health(): Promise<HealthResult> {
    return this.request<HealthResult>('/api/health', { method: 'GET' });
  }

  private buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
    const base = path.startsWith('http') ? path : `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    if (!query) return base;
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined) continue;
      params.set(k, String(v));
    }
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }

  private async withRetry<T>(url: string, method: string, body: unknown): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < this.maxRetries; attempt += 1) {
      try {
        return await this.attempt<T>(url, method, body);
      } catch (err) {
        lastError = err;
        if (err instanceof ServerError) {
          if (err.status < 500 && !this.retryOnStatuses.has(err.status)) {
            throw err;
          }
        }
        if (attempt < this.maxRetries - 1) {
          const delay = this.backoffMs[attempt] ?? this.backoffMs[this.backoffMs.length - 1] ?? 1000;
          await this.sleep(delay);
        }
      }
    }
    throw lastError;
  }

  private async attempt<T>(url: string, method: string, body: unknown): Promise<T> {
    const init: RequestInit = {
      method,
      headers: {
        'content-type': 'application/json',
        'X-Bot-Secret': this.sharedSecret,
      },
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
    let response: Response;
      response = await this.fetchImpl(url, init);
    const status = response.status;
    const text = await response.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }
    if (!response.ok) {
      throw new ServerError(status, parsed, this.extractMessage(parsed) ?? `server error ${status}`);
    }
    return parsed as T;
  }

  private extractMessage(body: unknown): string | undefined {
    if (body && typeof body === 'object' && 'error' in body) {
      const v = (body as { error: unknown }).error;
      if (typeof v === 'string') return v;
    }
    if (body && typeof body === 'object' && 'message' in body) {
      const v = (body as { message: unknown }).message;
      if (typeof v === 'string') return v;
    }
    return undefined;
  }
}
