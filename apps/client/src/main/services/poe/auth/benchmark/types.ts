/* ------------------------------------------------------------------ */
/*  GggTransport   – любой способ отправки HTTP к GGG                 */
/*  CookieProvider – любая стратегия установки cookie                  */
/* ------------------------------------------------------------------ */

export interface GggRequest {
  path: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: unknown;
  /** Параметры, которые transport должен добавить в URL / query */
  params?: Record<string, string>;
}

export interface GggResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  /** Реальное время отправки запроса (clock time) */
  timingMs: { start: number; end: number; duration: number };
}

export interface GggTransport {
  readonly id: string;
  readonly version: string;
  readonly description: string;
  /** Выполнить один HTTP-запрос к GGG */
  execute(req: GggRequest, cookieProvider: CookieProvider): Promise<GggResponse>;
}

export interface CookieProvider {
  readonly id: string;
  readonly version: string;
  readonly description: string;
  /** Вызывается перед запросом. Устанавливает cookie (в сессии / заголовках). Возвращает доп. заголовки для запроса. */
  prepare(transport: GggTransport): Promise<Record<string, string>>;
  /** Вызывается после запроса. Удаляет cookie, разрушает сессию. */
  cleanup(transport: GggTransport): Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Endpoint — минимальное описание, без «knownWorking»               */
/* ------------------------------------------------------------------ */

export interface EndpointDef {
  readonly name: string;
  readonly path: string;
  readonly method: 'GET' | 'POST';
  readonly params?: Record<string, string>;
  readonly category: 'character-window' | 'trade' | 'profile' | 'stash' | 'public';
}

/* ------------------------------------------------------------------ */
/*  Результат одного запроса                                          */
/* ------------------------------------------------------------------ */

export interface AuthBenchmarkResult {
  /* ---- идентификация ---- */
  transportId: string;
  transportVersion: string;
  cookieProviderId: string;
  cookieProviderVersion: string;
  endpoint: EndpointDef;
  poesessidMasked: string;
  retryStrategy: 'none' | 'once' | 'exponential';

  /* ---- результат ---- */
  success: boolean;
  statusCode: number | null;
  latencyMs: number;
  contentType: string | null;
  isHtml: boolean;
  isJson: boolean;
  bodySnippet: string; // первые 500 символов тела

  /* ---- заголовки (маскированные) ---- */
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;

  /* ---- Cloudflare ---- */
  cloudflareDetected: boolean;
  cfRay: string | null;

  /* ---- ошибки ---- */
  errorCode: string | null;
  errorMessage: string | null;
  retryCount: number;
  fallbackUsed: string | null;

  /* ---- артефакт ---- */
  artifactPath: string | null;

  timestamp: string;
}

/* ------------------------------------------------------------------ */
/*  BenchmarkRun  —  один запрос, который надо выполнить               */
/* ------------------------------------------------------------------ */

export interface BenchmarkRun {
  transport: GggTransport;
  cookieProvider: CookieProvider;
  endpoint: EndpointDef;
}

/* ------------------------------------------------------------------ */
/*  Отчёты                                                            */
/* ------------------------------------------------------------------ */

export interface TransportComparison {
  transportId: string;
  transportVersion: string;
  successRate: number;
  avgLatencyMs: number;
  cfBypassRate: number;
  sessionExpiredRate: number;
  gggUnavailableRate: number;
  rank: number;
}

export interface EndpointAnalysis {
  endpointName: string;
  bestTransportId: string;
  bestLatencyMs: number;
  successRateBest: number;
}

export interface BenchmarkReport {
  generatedAt: string;
  totalRuns: number;
  poesessidValid: boolean;
  transports: TransportComparison[];
  endpoints: EndpointAnalysis[];
  recommendation: {
    primary: { transportId: string; cookieProviderId: string };
    fallbacks: { transportId: string; cookieProviderId: string }[];
    rationale: string;
  };
}

export interface StressTestResult {
  scenario: string;
  transportId: string;
  attempts: number;
  successes: number;
  failures: number;
  avgLatencyMs: number;
  errorDistribution: Record<string, number>;
}
