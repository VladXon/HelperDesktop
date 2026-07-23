#!/usr/bin/env node
/**
 * Compare Engine results vs PoB Community reference
 * Generates detailed markdown report with per-build diffs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const ENGINE_DIR = resolve(__dirname, '..', '..', 'test-results', 'engine');
const POB_DIR = resolve(__dirname, '..', '..', 'test-results', 'pob-reference');
const REPORT_DIR = resolve(__dirname, '..', '..', 'test-results', 'golden-reports');
const TOLERANCE_PCT = 1.0;

interface EngineResult {
  buildId: string;
  buildName: string;
  className: string;
  ascendancy: string;
  level: number;
  stats: Record<string, number>;
}

interface PobResult {
  buildId: string;
  filename: string;
  stats: Record<string, number>;
  success: boolean;
  error?: string;
}

interface Comparison {
  stat: string;
  pob: number;
  engine: number;
  diff: number;
  diffPct: number;
  pass: boolean;
}

interface BuildReport {
  buildId: string;
  buildName: string;
  className: string;
  ascendancy: string;
  level: number;
  comparisons: Comparison[];
  passed: number;
  total: number;
  passRate: number;
}

function loadJsonLines(filepath: string): any[] {
  if (!existsSync(filepath)) return [];
  const content = readFileSync(filepath, 'utf-8');
  return content.trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
}

function compare(engine: EngineResult, pob: PobResult): BuildReport {
  const allKeys = new Set([...Object.keys(engine.stats), ...Object.keys(pob.stats)]);
  const comparisons: Comparison[] = [];
  
  for (const key of allKeys) {
    const eVal = engine.stats[key];
    const pVal = pob.stats[key];
    
    if (eVal === undefined || pVal === undefined) continue;
    if (eVal === 0 && pVal === 0) continue;
    
    const diff = eVal - pVal;
    const diffPct = pVal !== 0 ? (diff / pVal) * 100 : 0;
    const pass = Math.abs(diffPct) <= TOLERANCE_PCT;
    
    comparisons.push({ stat: key, pob: pVal, engine: eVal, diff, diffPct, pass });
  }
  
  const passed = comparisons.filter(c => c.pass).length;
  const total = comparisons.length;
  const passRate = total > 0 ? (passed / total) * 100 : 0;
  
  return {
    buildId: engine.buildId,
    buildName: engine.buildName,
    className: engine.className,
    ascendancy: engine.ascendancy,
    level: engine.level,
    comparisons,
    passed,
    total,
    passRate,
  };
}

function formatVal(v: number): string {
  if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'k';
  return v.toFixed(2);
}

function generateReport(reports: BuildReport[]): string {
  const totalBuilds = reports.length;
  const totalComparisons = reports.reduce((s, r) => s + r.total, 0);
  const totalPassed = reports.reduce((s, r) => s + r.passed, 0);
  const overallRate = totalComparisons > 0 ? (totalPassed / totalComparisons * 100).toFixed(1) : '0';
  
  let md = `# Golden Test Report — Engine vs PoB Community\n\n`;
  md += `**Generated:** ${new Date().toISOString()}\n`;
  md += `**Tolerance:** ±${TOLERANCE_PCT}%\n`;
  md += `**Builds Tested:** ${totalBuilds}\n`;
  md += `**Total Comparisons:** ${totalComparisons}\n`;
  md += `**Passed:** ${totalPassed} (${overallRate}%)\n\n`;
  
  // Summary table
  md += `## Summary by Build\n\n`;
  md += `| Build | Class | Level | Comparisons | Passed | Pass Rate |\n`;
  md += `|-------|-------|-------|-------------|--------|-----------|\n`;
  
  for (const r of reports.sort((a, b) => b.passRate - a.passRate)) {
    const name = `${r.buildName} (${r.className}${r.ascendancy ? ' ' + r.ascendancy : ''})`;
    md += `| ${name} | ${r.className} ${r.ascendancy || ''} | ${r.level} | ${r.total} | ${r.passed} | ${r.passRate.toFixed(1)}% |\n`;
  }
  
  // Stat aggregate
  md += `\n## Aggregate by Stat\n\n`;
  const statAggregates = new Map<string, { pass: number; total: number; maxDiffPct: number }>();
  
  for (const r of reports) {
    for (const c of r.comparisons) {
      const agg = statAggregates.get(c.stat) || { pass: 0, total: 0, maxDiffPct: 0 };
      agg.total++;
      if (c.pass) agg.pass++;
      agg.maxDiffPct = Math.max(agg.maxDiffPct, Math.abs(c.diffPct));
      statAggregates.set(c.stat, agg);
    }
  }
  
  md += `| Stat | Comparisons | Passed | Pass Rate | Max Diff % |\n`;
  md += `|------|-------------|--------|-----------|------------|\n`;
  
  for (const [stat, agg] of [...statAggregates.entries()].sort((a, b) => b[1].maxDiffPct - a[1].maxDiffPct)) {
    const rate = agg.total > 0 ? (agg.pass / agg.total * 100).toFixed(1) : '0';
    md += `| ${stat} | ${agg.total} | ${agg.pass} | ${rate}% | ${agg.maxDiffPct.toFixed(2)}% |\n`;
  }
  
  // Detailed per-build
  md += `\n## Detailed Comparisons\n\n`;
  
  for (const r of reports) {
    md += `### ${r.buildName} (${r.className}${r.ascendancy ? ' ' + r.ascendancy : ''}, L${r.level})\n`;
    md += `**Pass Rate:** ${r.passRate.toFixed(1)}% (${r.passed}/${r.total})\n\n`;
    
    md += `| Stat | PoB | Engine | Diff | Diff % | Status |\n`;
    md += `|------|-----|--------|------|--------|--------|\n`;
    
    for (const c of r.comparisons.sort((a, b) => Math.abs(b.diffPct) - Math.abs(a.diffPct))) {
      const status = c.pass ? '✅' : '❌';
      const diffStr = c.diff >= 0 ? '+' + formatVal(c.diff) : formatVal(c.diff);
      md += `| ${c.stat} | ${formatVal(c.pob)} | ${formatVal(c.engine)} | ${diffStr} | ${c.diffPct >= 0 ? '+' : ''}${c.diffPct.toFixed(2)}% | ${status} |\n`;
    }
    md += `\n`;
  }
  
  return md;
}

async function main() {
  console.log('=== Golden Test Comparison ===\n');
  
  if (!existsSync(ENGINE_DIR)) {
    console.error('Engine results not found:', ENGINE_DIR);
    process.exit(1);
  }
  
  if (!existsSync(POB_DIR)) {
    console.error('PoB results not found:', POB_DIR);
    process.exit(1);
  }
  
  if (!existsSync(REPORT_DIR)) {
    const { mkdirSync } = await import('node:fs');
    mkdirSync(REPORT_DIR, { recursive: true });
  }
  
  // Load engine results (from JSON files)
  const engineFiles = require('node:fs').readdirSync(ENGINE_DIR).filter(f => f.endsWith('.json'));
  const engineResults: EngineResult[] = [];
  
  for (const f of engineFiles) {
    const data = JSON.parse(readFileSync(resolve(ENGINE_DIR, f), 'utf-8'));
    engineResults.push(data);
  }
  
  // Load PoB results (from JSONL)
  const pobResults: PobResult[] = loadJsonLines(resolve(POB_DIR, 'pob-results.jsonl'));
  
  console.log(`Loaded ${engineResults.length} engine results`);
  console.log(`Loaded ${pobResults.length} PoB results`);
  
  // Match by buildId
  const reports: BuildReport[] = [];
  
  for (const engine of engineResults) {
    const pob = pobResults.find(p => p.buildId === engine.buildId && p.success);
    if (!pob) {
      console.log(`  No PoB reference for ${engine.buildId}`);
      continue;
    }
    
    const report = compare(engine, pob);
    reports.push(report);
    console.log(`  ${engine.buildName}: ${report.passRate.toFixed(1)}% pass`);
  }
  
  const markdown = generateReport(reports);
  const timestamp = Date.now();
  const reportPath = resolve(REPORT_DIR, `golden-report-${timestamp}.md`);
  writeFileSync(reportPath, markdown);
  
  // Also save JSON for CI
  const jsonPath = resolve(REPORT_DIR, `golden-report-${timestamp}.json`);
  writeFileSync(jsonPath, JSON.stringify(reports, null, 2));
  
  console.log(`\n=== Report saved ===`);
  console.log(`Markdown: ${reportPath}`);
  console.log(`JSON: ${jsonPath}`);
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});