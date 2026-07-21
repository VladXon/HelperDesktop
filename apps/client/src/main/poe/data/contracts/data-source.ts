import type { AdapterResult } from '@helper/shared';

export interface DataSource<T> {
  readonly name: string;
  readonly baseUrl: string;
  fetch(params?: Record<string, string>): Promise<AdapterResult<T>>;
  parse(raw: unknown): AdapterResult<T>;
  validate(data: T): boolean;
}

export interface DataSourceOptions {
  timeout?: number;
  retries?: number;
}
