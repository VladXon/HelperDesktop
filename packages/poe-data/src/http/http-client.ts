export interface HttpOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export interface HttpClient {
  get<T>(url: string, options?: HttpOptions): Promise<T>;

  post<T>(url: string, body?: unknown, options?: { headers?: Record<string, string> }): Promise<T>;
}

export class FetchHttpClient implements HttpClient {
  async get<T>(url: string, options?: HttpOptions): Promise<T> {
    const init: RequestInit = {};
    if (options?.signal) init.signal = options.signal;
    if (options?.headers) init.headers = options.headers;

    const response = await fetch(url, init);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return response.json() as Promise<T>;
    }
    return response.text() as Promise<unknown> as Promise<T>;
  }

  async post<T>(url: string, body?: unknown, options?: { headers?: Record<string, string> }): Promise<T> {
    const init: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    };
    if (body !== undefined) init.body = JSON.stringify(body);

    const response = await fetch(url, init);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return response.json() as Promise<T>;
    }
    return response.text() as Promise<unknown> as Promise<T>;
  }
}

export class MockHttpClient implements HttpClient {
  private _routes = new Map<string, unknown>();

  onGet(url: string, response: unknown): this {
    this._routes.set(`GET:${url}`, response);
    return this;
  }

  onPost(url: string, response: unknown): this {
    this._routes.set(`POST:${url}`, response);
    return this;
  }

  async get<T>(url: string, _options?: HttpOptions): Promise<T> {
    const key = `GET:${url}`;
    if (!this._routes.has(key)) {
      throw new Error(`MockHttpClient: no route registered for GET ${url}`);
    }
    const data = this._routes.get(key);
    if (data instanceof Error) throw data;
    return data as T;
  }

  async post<T>(url: string, _body?: unknown, _options?: { headers?: Record<string, string> }): Promise<T> {
    const key = `POST:${url}`;
    if (!this._routes.has(key)) {
      throw new Error(`MockHttpClient: no route registered for POST ${url}`);
    }
    const data = this._routes.get(key);
    if (data instanceof Error) throw data;
    return data as T;
  }
}
