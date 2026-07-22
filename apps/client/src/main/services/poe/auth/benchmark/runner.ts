import { saveArtifact } from './artifacts';
import type {
  GggTransport,
  CookieProvider,
  EndpointDef,
  AuthBenchmarkResult,
} from './types';

function maskPoesessid(poesessid: string): string {
  if (!poesessid || poesessid.length <= 8) return '***';
  return poesessid.slice(0, 4) + '***' + poesessid.slice(-4);
}

function maskHeaders(h: Record<string, string>): Record<string, string> {
  const m: Record<string, string> = {};
  for (const [k, v] of Object.entries(h)) {
    const kl = k.toLowerCase();
    m[k] = kl === 'cookie' || kl === 'authorization' ? '[REDACTED]' : v;
  }
  return m;
}

function hasCloudflareSignals(body: string, headers: Record<string, string>): { detected: boolean; cfRay: string | null } {
  const cfRay = headers['cf-ray'] ?? headers['CF-RAY'] ?? headers['Cf-Ray'] ?? null;
  const detected =
    body.includes('Cloudflare') ||
    body.includes('Just a moment') ||
    body.includes('Checking your browser') ||
    body.includes('cf-browser-verify') ||
    body.includes('_cf_chl_opt') ||
    (cfRay !== null && body.includes('<html'));
  return { detected, cfRay };
}

function classifyError(status: number | null, body: string): { code: string | null; message: string | null } {
  if (status === null) return { code: 'network_error', message: 'No response received' };
  if (status === 401) return { code: 'session_expired', message: 'GGG returned 401 Unauthorized' };
  if (status === 403) return { code: 'session_expired', message: 'GGG returned 403 Forbidden' };
  if (status === 404) return { code: 'session_invalid', message: 'Endpoint not found or invalid POESESSID' };
  if (status === 429) return { code: 'rate_limited', message: 'GGG rate limit hit' };
  if (status >= 500) return { code: 'ggg_unavailable', message: `GGG server error (${status})` };
  if (status !== 200) return { code: 'unknown', message: `Unexpected status ${status}` };
  return { code: null, message: null };
}

export async function executeSingleRun(
  transport: GggTransport,
  cookieProvider: CookieProvider,
  endpoint: EndpointDef,
  poesessid: string,
  retryStrategy: 'none' | 'once' = 'none',
): Promise<AuthBenchmarkResult> {
  const t0 = performance.now();
  let retryCount = 0;

  let response;
  try {
    response = await transport.execute(
      { path: endpoint.path, method: endpoint.method, params: endpoint.params },
      cookieProvider,
    );
  } catch (err) {
    response = {
      status: 0,
      headers: {},
      body: err instanceof Error ? err.message : String(err),
      timingMs: { start: t0, end: performance.now(), duration: performance.now() - t0 },
    };
    retryCount = 1;
  }

  const duration = response.timingMs.duration;
  const bodyText = typeof response.body === 'string' ? response.body : JSON.stringify(response.body);
  const ct = response.headers?.['content-type'] ?? response.headers?.['Content-Type'] ?? null;
  const isHtml = ct ? ct.includes('text/html') : bodyText.trim().startsWith('<!DOCTYPE') || bodyText.trim().startsWith('<html');
  const isJson = ct ? ct.includes('application/json') : false;
  const cf = hasCloudflareSignals(bodyText, response.headers ?? {});
  const err = classifyError(response.status, bodyText);
  const success = response.status === 200 && !cf.detected;

  let artifactPath: string | null = null;
  try {
    artifactPath = saveArtifact(
      transport.id,
      { path: endpoint.path, method: endpoint.method, params: endpoint.params },
      response,
      cookieProvider.id,
    );
  } catch { /* best-effort */ }

  return {
    transportId: transport.id,
    transportVersion: transport.version,
    cookieProviderId: cookieProvider.id,
    cookieProviderVersion: cookieProvider.version,
    endpoint,
    poesessidMasked: maskPoesessid(poesessid),
    retryStrategy,
    success,
    statusCode: response.status === 0 ? null : response.status,
    latencyMs: Math.round(duration),
    contentType: ct,
    isHtml,
    isJson,
    bodySnippet: bodyText.slice(0, 500),
    requestHeaders: maskHeaders({}),
    responseHeaders: response.headers ?? {},
    cloudflareDetected: cf.detected,
    cfRay: cf.cfRay,
    errorCode: err.code,
    errorMessage: err.message,
    retryCount,
    fallbackUsed: null,
    artifactPath,
    timestamp: new Date().toISOString(),
  };
}

export async function runMatrix(
  transports: GggTransport[],
  cookieProviders: CookieProvider[],
  endpoints: EndpointDef[],
  poesessid: string,
): Promise<AuthBenchmarkResult[]> {
  const results: AuthBenchmarkResult[] = [];

  for (const transport of transports) {
    for (const cookieProvider of cookieProviders) {
      for (const endpoint of endpoints) {
        console.log(`[benchmark] transport=${transport.id} cookie=${cookieProvider.id} endpoint=${endpoint.path}`);
        const result = await executeSingleRun(transport, cookieProvider, endpoint, poesessid, 'none');
        results.push(result);
        const icon = result.success ? 'OK' : 'FAIL';
        console.log(`[benchmark] → ${result.statusCode} ${icon} (${result.errorCode}) ${result.latencyMs}ms`);
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }

  return results;
}

export async function runStressTest(
  transport: GggTransport,
  cookieProvider: CookieProvider,
  endpoint: EndpointDef,
  poesessid: string,
  iterations: number,
): Promise<AuthBenchmarkResult[]> {
  const results: AuthBenchmarkResult[] = [];
  for (let i = 0; i < iterations; i++) {
    const result = await executeSingleRun(transport, cookieProvider, endpoint, poesessid, 'none');
    results.push(result);
    if (i < iterations - 1) await new Promise((r) => setTimeout(r, 500));
  }
  return results;
}
