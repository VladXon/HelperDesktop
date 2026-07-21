import type { AdapterResult } from '@helper/shared';
import type { HttpClient } from '../../http/http-client.js';

export interface DataSource<T> {
  readonly name: string;
  readonly baseUrl: string;
  readonly httpClient: HttpClient;
  fetch(params?: Record<string, string>): Promise<AdapterResult<T>>;
}

export interface DataSourceOptions {
  timeout?: number;
  retries?: number;
}
