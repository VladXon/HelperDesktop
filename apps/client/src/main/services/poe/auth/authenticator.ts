/* ------------------------------------------------------------------ */
/*  IGggAuthenticator — единый интерфейс аутентификации GGG            */
/* ------------------------------------------------------------------ */

export interface GggAuthHeaders {
  headers: Record<string, string>;
  accountName?: string;
  authType: 'session' | 'oauth' | 'none';
}

export interface TransportSelection {
  requestedAuthenticator: string;
  selectedTransport: string;
  selected: boolean;
  fallbackAttempted: boolean;
  fallbackReason: string | null;
}

export interface AuthAttemptLog {
  authenticatorId: string;
  transport: string;
  endpoint: string;
  success: boolean;
  latencyMs: number;
  statusCode: number | null;
  cloudflareDetected: boolean;
  fallbackUsed: string | null;
  errorCategory: string | null;
  timestamp: string;
}

export type ErrorCategory =
  | 'session_expired'
  | 'cloudflare_block'
  | 'rate_limited'
  | 'network_error'
  | 'ggg_unavailable'
  | 'invalid_params'
  | null;

export interface ValidationResult {
  valid: boolean;
  accountName?: string;
  errorCategory: ErrorCategory;
  errorMessage: string | null;
  /** Какой транспорт был выбран и почему */
  transportSelection: TransportSelection;
}

export interface PartitionInfo {
  partitionName: string;
  isPersistent: boolean;
  accountId: string | null;
}

export interface IGggAuthenticator {
  readonly id: string;
  readonly description: string;
  readonly authType: 'session' | 'oauth' | 'none';

  /** Возвращает информацию о партиции Chromium (для multi-account). */
  getPartitionInfo(): PartitionInfo | null;

  /** Валидирует состояние. Возвращает заголовки для GGG-запросов. */
  authenticate(): Promise<GggAuthHeaders>;

  /** Валидация с категорией ошибки для fallback-логики. */
  validate(): Promise<ValidationResult>;

  /** Получить имя аккаунта. */
  getAccountName(): Promise<string | null>;

  /** Очистить состояние (logout). */
  invalidate(): Promise<void>;

  /** Логи попыток. */
  getAttemptLogs(): AuthAttemptLog[];
}

/**
 * Категории, при которых fallback-chain ПРОДОЛЖАЕТ перебор.
 */
export const FALLBACK_CATEGORIES: ErrorCategory[] = [
  'session_expired',
  'cloudflare_block',
  'network_error',
];
