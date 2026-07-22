import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { AuthBenchmarkResult, BenchmarkReport, TransportComparison, EndpointAnalysis, StressTestResult } from './types';

const REPORTS_DIR = join(process.cwd(), 'benchmarks');

function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

/* ------------------------------------------------------------------ */
/*  JSON-отчёт                                                       */
/* ------------------------------------------------------------------ */

export function generateReport(results: AuthBenchmarkResult[]): BenchmarkReport {
  const transportIds = [...new Set(results.map((r) => r.transportId))];

  const transports: TransportComparison[] = transportIds.map((tid) => {
    const tr = results.filter((r) => r.transportId === tid);
    const total = tr.length;
    const ok = tr.filter((r) => r.success).length;
    const cf = tr.filter((r) => r.cloudflareDetected).length;
    const expired = tr.filter((r) => r.errorCode === 'session_expired').length;
    const down = tr.filter((r) => r.errorCode === 'ggg_unavailable').length;
    const avg = tr.reduce((s, r) => s + r.latencyMs, 0) / (total || 1);

    return {
      transportId: tid,
      transportVersion: tr[0]?.transportVersion ?? '?',
      successRate: total > 0 ? ok / total : 0,
      avgLatencyMs: Math.round(avg),
      cfBypassRate: total > 0 ? (total - cf) / total : 0,
      sessionExpiredRate: total > 0 ? expired / total : 0,
      gggUnavailableRate: total > 0 ? down / total : 0,
      rank: 0,
    };
  });

  transports.sort((a, b) => b.successRate - a.successRate);
  transports.forEach((t, i) => (t.rank = i + 1));

  const endpointNames = [...new Set(results.map((r) => r.endpoint.name))];
  const endpoints: EndpointAnalysis[] = endpointNames.map((name) => {
    const er = results.filter((r) => r.endpoint.name === name && r.success);
    let best = er[0];
    for (const r of er) {
      if (r.latencyMs < (best?.latencyMs ?? Infinity)) best = r;
    }
    return {
      endpointName: name,
      bestTransportId: best?.transportId ?? 'NONE',
      bestLatencyMs: best?.latencyMs ?? 0,
      successRateBest: er.length > 0 ? er.filter((r) => r.transportId === best?.transportId).length / er.filter((_r) => true).length : 0,
    };
  });

  const primary = transports[0] ?? null;
  const uniqCookies = [...new Set(results.map((r) => r.cookieProviderId))];

  return {
    generatedAt: new Date().toISOString(),
    totalRuns: results.length,
    poesessidValid: results.some((r) => r.success),
    transports,
    endpoints,
    recommendation: primary
      ? {
          primary: { transportId: primary.transportId, cookieProviderId: uniqCookies[0] ?? '?' },
          fallbacks: transports.slice(1, 3).map((t) => ({ transportId: t.transportId, cookieProviderId: uniqCookies[0] ?? '?' })),
          rationale: `Best success rate (${(primary.successRate * 100).toFixed(1)}%) with ${primary.avgLatencyMs}ms avg latency`,
        }
      : { primary: { transportId: 'NONE', cookieProviderId: 'NONE' }, fallbacks: [], rationale: 'No transport succeeded' },
  };
}

export function saveJsonReport(report: BenchmarkReport): string {
  ensureDir(REPORTS_DIR);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const path = join(REPORTS_DIR, `report-${ts}.json`);
  writeFileSync(path, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\n[reporter] JSON report → ${path}`);
  return path;
}

/* ------------------------------------------------------------------ */
/*  Markdown-отчёт                                                   */
/* ------------------------------------------------------------------ */

export function generateMarkdown(report: BenchmarkReport): string {
  let md = `# PoE Authentication Benchmark Report\n\n`;
  md += `**Generated**: ${report.generatedAt}\n`;
  md += `**Total runs**: ${report.totalRuns}\n`;
  md += `**POESESSID valid**: ${report.poesessidValid ? 'YES' : 'NO'}\n\n`;

  md += `## Transport Comparison\n\n`;
  md += `| Rank | Transport | Version | Success % | Avg Latency | CF Bypass % | Session Expired % | GGG Down % |\n`;
  md += `|------|-----------|---------|-----------|-------------|-------------|-------------------|------------|\n`;
  for (const t of report.transports) {
    md += `| ${t.rank} | ${t.transportId} | ${t.transportVersion} | ${(t.successRate * 100).toFixed(1)}% | ${t.avgLatencyMs}ms | ${(t.cfBypassRate * 100).toFixed(1)}% | ${(t.sessionExpiredRate * 100).toFixed(1)}% | ${(t.gggUnavailableRate * 100).toFixed(1)}% |\n`;
  }

  md += `\n## Endpoint Analysis\n\n`;
  md += `| Endpoint | Best Transport | Best Latency |\n`;
  md += `|----------|---------------|-------------|\n`;
  for (const e of report.endpoints) {
    md += `| ${e.endpointName} | ${e.bestTransportId} | ${e.bestLatencyMs}ms |\n`;
  }

  md += `\n## Recommendation\n\n`;
  md += `**Primary**: \`${report.recommendation.primary.transportId}\` + \`${report.recommendation.primary.cookieProviderId}\`\n`;
  if (report.recommendation.fallbacks.length > 0) {
    md += `**Fallbacks**: ${report.recommendation.fallbacks.map((f) => `\`${f.transportId}\``).join(', ')}\n`;
  }
  md += `\n**Rationale**: ${report.recommendation.rationale}\n`;

  return md;
}

export function saveMarkdownReport(report: BenchmarkReport): string {
  ensureDir(REPORTS_DIR);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const path = join(REPORTS_DIR, `report-${ts}.md`);
  writeFileSync(path, generateMarkdown(report), 'utf-8');
  console.log(`[reporter] Markdown report → ${path}`);
  return path;
}

/* ------------------------------------------------------------------ */
/*  CSV-отчёт                                                        */
/* ------------------------------------------------------------------ */

export function generateCsv(results: AuthBenchmarkResult[]): string {
  const header = 'timestamp,transport,cookieProvider,endpoint,success,statusCode,latencyMs,isHtml,isJson,cloudflareDetected,cfRay,errorCode,errorMessage,retryCount,artifactPath';
  const rows = results.map((r) =>
    [
      r.timestamp,
      `"${r.transportId}"`,
      `"${r.cookieProviderId}"`,
      `"${r.endpoint.path}"`,
      r.success,
      r.statusCode,
      r.latencyMs,
      r.isHtml,
      r.isJson,
      r.cloudflareDetected,
      `"${r.cfRay ?? ''}"`,
      `"${r.errorCode ?? ''}"`,
      `"${(r.errorMessage ?? '').replace(/"/g, '\'')}"`,
      r.retryCount,
      `"${r.artifactPath ?? ''}"`,
    ].join(','),
  );
  return [header, ...rows].join('\n');
}

export function saveCsvReport(results: AuthBenchmarkResult[]): string {
  ensureDir(REPORTS_DIR);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const path = join(REPORTS_DIR, `results-${ts}.csv`);
  writeFileSync(path, generateCsv(results), 'utf-8');
  console.log(`[reporter] CSV report → ${path}`);
  return path;
}

/* ------------------------------------------------------------------ */
/*  Стресс-тест отчёт                                                */
/* ------------------------------------------------------------------ */

export function generateStressReport(results: AuthBenchmarkResult[], scenario: string): StressTestResult {
  const attempts = results.length;
  const successes = results.filter((r) => r.success).length;
  const avg = results.reduce((s, r) => s + r.latencyMs, 0) / (attempts || 1);
  const dist: Record<string, number> = {};
  for (const r of results) {
    if (!r.success && r.errorCode) {
      dist[r.errorCode] = (dist[r.errorCode] ?? 0) + 1;
    }
  }
  return {
    scenario,
    transportId: results[0]?.transportId ?? '?',
    attempts,
    successes,
    failures: attempts - successes,
    avgLatencyMs: Math.round(avg),
    errorDistribution: dist,
  };
}

export function saveStressReport(report: StressTestResult): string {
  ensureDir(REPORTS_DIR);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const path = join(REPORTS_DIR, `stress-${ts}.json`);
  writeFileSync(path, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`[reporter] Stress report → ${path}`);
  return path;
}
