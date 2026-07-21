export interface AdapterMetadata {
  source: string;
  fetchedAt: number;
  requestId?: string;
  version?: string;
  cached: boolean;
}

export interface AdapterSuccess<T> {
  ok: true;
  data: T;
  meta: AdapterMetadata;
}

export interface AdapterError {
  ok: false;
  error: string;
  retryAfter?: number;
}

export type AdapterResult<T> = AdapterSuccess<T> | AdapterError;
