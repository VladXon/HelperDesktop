#!/usr/bin/env node
/**
 * Engine Soak Test — Long-running memory & performance validation
 * 
 * Runs import → calculate → cleanup cycles for hours.
 * Monitors: heap, GC, event listeners, calc latency.
 * 
 * Usage:
 *   node --expose-gc scripts/stress-test/engine-soak.ts
 *   node --expose-gc --trace-gc scripts/stress-test/engine-soak.ts 2>&1 | tee soak.log
 */

import { parsePobXml, convertPobDto } from '@helper/poe-data/pob';
import { createModDB, calculateBuild, defaultConditionState } from '@helper/poe-engine';
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const GOLDEN_DIR = resolve(__dirname, '..', 'golden-builds');
const REPORT_DIR = resolve(__dirname, '..', 'stress-reports');

interface CycleMetrics {
  cycle: number;
  timestamp: number;
  buildId: string;
  
  // Memory
  heapUsedMB: number;
  heapTotalMB: number;
  externalMB: number;
  rssMB: number;
  
  // GC
  gcCount: number;
  gcDurationMs: number;
  gcForced: boolean;
  
  // Handles
  activeHandles: number;
  activeListeners: number;
  
  // Timing
  importMs: number;
  convertMs: number;
  calcMs: number;
  totalMs: number;
  
  // Result
  success: boolean;
  error?: string;
}

let gcStats = { count: 0, duration: 0 };

// Hook GC if available
if (typeof global.gc === 'function') {
  const originalGc = global.gc;
  global.gc = function(...args) {
    const start = process.hrtime.bigint();
    const result = originalGc.apply(this, args);
    const duration = Number(process.hrtime.bigint() - start) / 1e6;
    gcStats.count++;
    gcStats.duration += duration;
    return result;
  };
}

function getEventListenerCount(): number {
  // Approximate: count EventEmitter listeners on process + global
  let count = 0;
  for (const [, emitter] of Object.entries(process)) {
    if (emitter && typeof emitter.listenerCount === 'function') {
      count += emitter.listenerCount('');
    }
  }
  return count;
}

function getHandleCount(): number {
  return (process as any)._getActiveHandles?.()?.length ?? 0;
}

async function runCycle(builds: string[], cycle: number): Promise<CycleMetrics> {
  const buildPath = builds[cycle % builds.length];
  const buildId = buildPath.split('/').pop()!.replace('.pob.xml', '');
  const xml = readFileSync(buildPath, 'utf-8');
  
  const memBefore = process.memoryUsage();
  const gcBefore = { ...gcStats };
  
  const metrics: CycleMetrics = {
    cycle,
    timestamp: Date.now(),
    buildId,
    heapUsedMB: 0,
    heapTotalMB: 0,
    externalMB: 0,
    rssMB: 0,
    gcCount: 0,
    gcDurationMs: 0,
    gcForced: false,
    activeHandles: 0,
    activeListeners: 0,
    importMs: 0,
    convertMs: 0,
    calcMs: 0,
    totalMs: 0,
    success: false,
  };
  
  const totalStart = process.hrtime.bigint();
  
  try {
    // 1. Parse PoB XML
    const importStart = process.hrtime.bigint();
    const dto = parsePobXml(xml);
    metrics.importMs = Number(process.hrtime.bigint() - importStart) / 1e6;
    
    // 2. Convert to engine modifiers
    const convertStart = process.hrtime.bigint();
    const modifiers = convertPobDto(dto);
    metrics.convertMs = Number(process.hrtime.bigint() - convertStart) / 1e6;
    
    // 3. Calculate build
    const calcStart = process.hrtime.bigint();
    const modDB = createModDB();
    modDB.addMany(modifiers);
    const snapshot = modDB.snapshot();
    
    calculateBuild({
      baseStats: {},
      modSnapshot: snapshot,
      conditionState: defaultConditionState(),
    });
    metrics.calcMs = Number(process.hrtime.bigint() - calcStart) / 1e6;
    
    // Force cleanup
    if (global.gc) {
      global.gc();
      metrics.gcForced = true;
    }
    
    metrics.success = true;
  } catch (e) {
    metrics.error = e instanceof Error ? e.message : String(e);
  }
  
  metrics.totalMs = Number(process.hrtime.bigint() - totalStart) / 1e6;
  
  // Memory after
  const memAfter = process.memoryUsage();
  metrics.heapUsedMB = memAfter.heapUsed / 1024 / 1024;
  metrics.heapTotalMB = memAfter.heapTotal / 1024 / 1024;
  metrics.externalMB = memAfter.external / 1024 / 1024;
  metrics.rssMB = memAfter.rss / 1024 / 1024;
  
  // GC delta
  metrics.gcCount = gcStats.count - gcBefore.count;
  metrics.gcDurationMs = gcStats.duration - gcBefore.duration;
  
  // Handles
  metrics.activeHandles = getHandleCount();
  metrics.activeListeners = getEventListenerCount();
  
  return metrics;
}

function formatMetrics(m: CycleMetrics): string {
  const status = m.success ? '✅' : '❌';
  const gc = m.gcForced ? ' (forced)' : '';
  return `${status} #${m.cycle} ${m.buildId} | ${m.totalMs.toFixed(1)}ms (imp:${m.importMs.toFixed(1)} conv:${m.convertMs.toFixed(1)} calc:${m.calcMs.toFixed(1)}) | Heap: ${m.heapUsedMB.toFixed(1)}/${m.heapTotalMB.toFixed(1)}MB | GC: ${m.gcCount}${gc} ${m.gcDurationMs.toFixed(1)}ms | Handles: ${m.activeHandles} | Listeners: ${m.activeListeners}`;
}

async function main() {
  console.log('=== Engine Soak Test ===\n');
  
  if (!existsSync(GOLDEN_DIR)) {
    console.error('Golden builds not found. Run fetch-pobb-builds.ts first.');
    process.exit(1);
  }
  
  if (!existsSync(REPORT_DIR)) {
    mkdirSync(REPORT_DIR, { recursive: true });
  }
  
  const builds = readdirSync(GOLDEN_DIR)
    .filter(f => f.endsWith('.pob.xml'))
    .map(f => resolve(GOLDEN_DIR, f));
  
  if (builds.length === 0) {
    console.error('No PoB builds found');
    process.exit(1);
  }
  
  console.log(`Loaded ${builds.length} test builds`);
  console.log(`GC exposed: ${typeof global.gc === 'function'}`);
  console.log(`Running cycles... (Ctrl+C to stop)\n`);
  
  const CYCLES = process.env.CYCLES ? parseInt(process.env.CYCLES) : 10000;
  const REPORT_EVERY = 50;
  const JSONL_PATH = resolve(REPORT_DIR, `soak-${Date.now()}.jsonl`);
  const CSV_PATH = resolve(REPORT_DIR, `soak-${Date.now()}.csv`);
  
  // CSV header
  writeFileSync(CSV_PATH, 'cycle,timestamp,buildId,heapUsedMB,heapTotalMB,externalMB,rssMB,gcCount,gcDurationMs,gcForced,activeHandles,activeListeners,importMs,convertMs,calcMs,totalMs,success,error\n');
  
  let consecutiveFailures = 0;
  const baselineHeap = process.memoryUsage().heapUsed / 1024 / 1024;
  
  for (let i = 0; i < CYCLES; i++) {
    const metrics = await runCycle(builds, i);
    
    // JSONL
    writeFileSync(JSONL_PATH, JSON.stringify(metrics) + '\n', { flag: 'a' });
    
    // CSV
    const csvRow = [
      metrics.cycle, metrics.timestamp, metrics.buildId,
      metrics.heapUsedMB.toFixed(2), metrics.heapTotalMB.toFixed(2),
      metrics.externalMB.toFixed(2), metrics.rssMB.toFixed(2),
      metrics.gcCount, metrics.gcDurationMs.toFixed(2), metrics.gcForced,
      metrics.activeHandles, metrics.activeListeners,
      metrics.importMs.toFixed(2), metrics.convertMs.toFixed(2),
      metrics.calcMs.toFixed(2), metrics.totalMs.toFixed(2),
      metrics.success, metrics.error ? `"${metrics.error.replace(/"/g, '""')}"` : ''
    ].join(',');
    writeFileSync(CSV_PATH, csvRow + '\n', { flag: 'a' });
    
    if (metrics.success) {
      consecutiveFailures = 0;
    } else {
      consecutiveFailures++;
      if (consecutiveFailures > 10) {
        console.error('\n💥 Too many consecutive failures, aborting');
        process.exit(1);
      }
    }
    
    if (i % REPORT_EVERY === 0 || !metrics.success) {
      console.log(formatMetrics(metrics));
      
      // Leak detection
      const heapGrowth = metrics.heapUsedMB - baselineHeap;
      if (heapGrowth > 100) {
        console.warn(`  ⚠️  Heap growth: +${heapGrowth.toFixed(1)}MB since start`);
      }
      if (metrics.activeHandles > 100) {
        console.warn(`  ⚠️  High handle count: ${metrics.activeHandles}`);
      }
      if (metrics.activeListeners > 200) {
        console.warn(`  ⚠️  High listener count: ${metrics.activeListeners}`);
      }
      if (metrics.totalMs > 500) {
        console.warn(`  ⚠️  Slow cycle: ${metrics.totalMs.toFixed(1)}ms`);
      }
    }
  }
  
  console.log('\n=== Soak test complete ===');
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});