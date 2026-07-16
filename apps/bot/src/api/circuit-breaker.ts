export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  onStateChange?: (state: CircuitState) => void;
  now?: () => number;
  shouldCount?: (err: unknown) => boolean;
}

export class CircuitOpenError extends Error {
  constructor(message = 'circuit breaker is open') {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

export class CircuitBreaker {
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly onStateChange?: (state: CircuitState) => void;
  private readonly now: () => number;
  private readonly shouldCount: (err: unknown) => boolean;

  private stateValue: CircuitState = 'closed';
  private consecutiveFailures = 0;
  private openedAt = 0;

  constructor(opts: CircuitBreakerOptions) {
    this.failureThreshold = opts.failureThreshold;
    this.resetTimeoutMs = opts.resetTimeoutMs;
    this.onStateChange = opts.onStateChange;
    this.now = opts.now ?? Date.now;
    this.shouldCount = opts.shouldCount ?? (() => true);
  }

  state(): CircuitState {
    if (this.stateValue === 'open' && this.now() - this.openedAt >= this.resetTimeoutMs) {
      this.transition('half-open');
    }
    return this.stateValue;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const current = this.state();
    if (current === 'open') {
      throw new CircuitOpenError();
    }
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      if (this.shouldCount(err)) {
        this.onFailure();
      }
      throw err;
    }
  }

  private onSuccess(): void {
    if (this.stateValue === 'half-open') {
      this.consecutiveFailures = 0;
      this.transition('closed');
      return;
    }
    this.consecutiveFailures = 0;
  }

  private onFailure(): void {
    if (this.stateValue === 'half-open') {
      this.openedAt = this.now();
      this.transition('open');
      return;
    }
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.failureThreshold) {
      this.openedAt = this.now();
      this.transition('open');
    }
  }

  private transition(next: CircuitState): void {
    if (this.stateValue === next) return;
    this.stateValue = next;
    this.onStateChange?.(next);
  }
}
