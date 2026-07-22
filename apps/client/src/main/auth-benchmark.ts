/**
 * PoE Authentication Benchmark — Electron Entry Point
 *
 * Usage:
 *   electron .vite/auth-benchmark/main.js --mode=benchmark --poesessid=YOUR_SESSION_ID
 *   electron .vite/auth-benchmark/main.js --mode=stress --poesessid=... --iterations=50
 *   electron .vite/auth-benchmark/main.js --mode=compare
 *
 * Provides:
 *   - npm run auth:benchmark   (full matrix)
 *   - npm run auth:stress      (single transport, many iterations)
 *   - npm run auth:compare     (compare all transports on validation endpoints)
 */

import { app } from 'electron';
import { runMatrix, runStressTest } from './services/poe/auth/benchmark/runner';
import { generateReport, saveJsonReport, saveMarkdownReport, saveCsvReport, generateStressReport, saveStressReport } from './services/poe/auth/benchmark/reporter';
import { ENDPOINTS, SESSION_VALIDATION_ENDPOINTS } from './services/poe/auth/benchmark/endpoints';

import { electronNetFetchTransport } from './services/poe/auth/benchmark/transports/electron-net-fetch';
import { electronNetRequestSessionTransport } from './services/poe/auth/benchmark/transports/electron-net-request';
import { browserWindowExecJsTransport } from './services/poe/auth/benchmark/transports/browserwindow-execjs';
import { nodeFetchTransport } from './services/poe/auth/benchmark/transports/node-fetch';

import { poesessidHeaderProvider, setHeaderPoesessid } from './services/poe/auth/benchmark/cookies/poesessid-header';
import { chromiumSessionProvider, setSessionPoesessid } from './services/poe/auth/benchmark/cookies/chromium-session';
import { clearedCookiesProvider, setClearedPoesessid } from './services/poe/auth/benchmark/cookies/cleared-cookies';

function parseArgs(): { mode: string; poesessid?: string; iterations?: number } {
  const args: Record<string, string> = {};
  for (const arg of process.argv) {
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq >= 0) {
        args[arg.slice(2, eq)] = arg.slice(eq + 1);
      } else {
        args[arg.slice(2)] = 'true';
      }
    }
  }
  return {
    mode: args['mode'] ?? 'benchmark',
    poesessid: args['poesessid'],
    iterations: args['iterations'] ? parseInt(args['iterations'], 10) : undefined,
  };
}

async function main(): Promise<void> {
  await app.whenReady();

  const { mode, poesessid, iterations } = parseArgs();

  if (!poesessid) {
    console.error('ERROR: --poesessid is required. Example: --poesessid=abc123...');
    app.quit();
    return;
  }

  console.log('========================================');
  console.log('  PoE Authentication Benchmark');
  console.log('========================================');
  console.log(`  Mode:       ${mode}`);
  console.log(`  POESESSID:  ${poesessid.slice(0, 4)}***${poesessid.slice(-4)}`);
  console.log(`  Iterations: ${iterations ?? '(N/A)'}`);
  console.log('========================================\n');

  const ALL_TRANSPORTS = [
    electronNetFetchTransport,
    electronNetRequestSessionTransport,
    browserWindowExecJsTransport,
    nodeFetchTransport,
  ];

  const ALL_COOKIES = [
    poesessidHeaderProvider,
    chromiumSessionProvider,
    clearedCookiesProvider,
  ];

  // Set POESESSID on all cookie providers
  setHeaderPoesessid(poesessid);
  setSessionPoesessid(poesessid);
  setClearedPoesessid(poesessid);

  if (mode === 'stress') {
    console.log('[stress] Running stress test...\n');
    const iter = iterations ?? 50;
    const results = await runStressTest(
      electronNetFetchTransport,
      poesessidHeaderProvider,
      SESSION_VALIDATION_ENDPOINTS[0]!, // get-account-name
      poesessid,
      iter,
    );

    const report = generateStressReport(results, `${iter} iterations — get-account-name`);
    saveStressReport(report);
    console.log(`\n[stress] Done. ${report.successes}/${report.attempts} succeeded (${((report.successes / report.attempts) * 100).toFixed(1)}%)`);
    console.log(`[stress] Avg latency: ${report.avgLatencyMs}ms`);
    console.log(`[stress] Errors: ${JSON.stringify(report.errorDistribution)}\n`);

  } else if (mode === 'compare') {
    console.log('[compare] Running transport comparison on validation endpoints...\n');
    const results = await runMatrix(ALL_TRANSPORTS, ALL_COOKIES, SESSION_VALIDATION_ENDPOINTS, poesessid);
    const report = generateReport(results);
    saveJsonReport(report);
    saveMarkdownReport(report);
    saveCsvReport(results);
    console.log(`\n[compare] Recommendation: ${report.recommendation.primary.transportId} + ${report.recommendation.primary.cookieProviderId}`);
    console.log(`[compare] ${report.recommendation.rationale}\n`);

  } else {
    // default: full matrix benchmark
    console.log('[benchmark] Running full matrix...\n');
    const results = await runMatrix(ALL_TRANSPORTS, ALL_COOKIES, ENDPOINTS, poesessid);
    const report = generateReport(results);
    saveJsonReport(report);
    saveMarkdownReport(report);
    saveCsvReport(results);
    console.log(`\n[benchmark] Reports generated in ./benchmarks/`);
    console.log(`[benchmark] Recommendation: ${report.recommendation.primary.transportId} + ${report.recommendation.primary.cookieProviderId}`);
    console.log(`[benchmark] ${report.recommendation.rationale}\n`);
  }

  app.quit();
}

main().catch((err) => {
  console.error('Fatal benchmark error:', err);
  app.quit();
});
