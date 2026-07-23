#!/usr/bin/env node
/**
 * Long-Running Stress Test — Memory & Performance
 * 
 * Runs import → calculate → cleanup cycles for hours.
 * Monitors: heap usage, GC frequency, event listeners, calc latency.
 */

import { parsePobXml, convertPobDto } from '@helper/poe-data/pob';
import { createModDB, calculateBuild } from '@helper/poe-engine';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const GOLDEN_DIR = resolve(__dirname, '..', 'golden-builds');

interface StressMetrics {
  timestamp: number;
  cycle: number;
  heapUsedMB: number;
  heapTotalMB: number;
  externalMB: number;
  gcCount: number;
  gcDurationMs: number;
  activeHandles: number;
  activeListeners: number;
  importMs: number;
  convertMs: number;
  calcMs: number;
  totalMs: number;
  success: boolean;
  error?: string;
}

const CYCLES = 10000; // Run indefinitely until killed
const REPORT_INTERVAL = 100; // Log every N cycles
const GC_SAMPLE_INTERVAL = 10; // Sample GC every N cycles

let gcCount = 0;
let gcDuration = 0;

const originalGC = global.gc;
if (typeof global.gc === 'function') {
  global.gc = function() {
    const start = process.hrtime.bigint();
    originalGC?.call(global);
    const end = process.hrtime.bigint();
    gcCount++;
    gcDuration += Number(end - start) / 1e6;
  };
}

function getMetrics(): StressMetrics {
  const mem = process.memoryUsage();
  return {
    timestamp: Date.now(),
    cycle: 0, // Set by caller
    heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100,
    heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024 * 100) / 100,
    externalMB: Math.round(mem.external / 1024 / 1024 * 100) / 100,
    gcCount,
    gcDurationMs: Math.round(gcDuration * 100) / 100,
    activeHandles: process._getActiveHandles?.().length ?? 0,
    activeListeners: process._getActiveRequests?.().length ?? 0,
    importMs: 0,
    convertMs: 0,
    calcMs: 0,
    totalMs: 0,
    success: true,
  };
}

function getRandomBuild(): string {
  const files = readdirSync(GOLDEN_DIR).filter(f => f.endsWith('.pob.xml'));
  return resolve(GOLDEN_DIR, files[Math.floor(Math.random() * files.length)]);
}

async function runCycle(cycle: number): Promise<StressMetrics> {
  const m = getMetrics();
  m.cycle = cycle;
  
  try {
    // 1. Import
    const importStart = process.hrtime.bigint();
    const xml = readFileSync(getRandomBuild(), 'utf-8');
    const dto = parsePobXml(xml);
    m.importMs = Number(process.hrtime.bigint() - importStart) / 1e6;
    
    // 2. Convert
    const convertStart = process.hrtime.bigint();
    const modifiers = convertPobDto(dto);
    m.convertMs = Number(process.hrtime.bigint() - convertStart) / 1e6;
    
    // 3. Calculate
    const calcStart = process.hrtime.bigint();
    if (modifiers.length > 0) {
      const modDB = createModDB();
      modDB.addMany(modifiers);
      const snapshot = modDB.snapshot();
      calculateBuild({
        baseStats: {},
        modSnapshot: snapshot,
        conditionState: { isOnLowLife: false, isOnFullLife: true, buffs: [], curses: [] },
      });
    }
    m.calcMs = Number(process.hrtime.bigint() - calcStart) / 1e6;
    
    m.totalMs = m.importMs + m.convertMs + m.calcMs;
    m.success = true;
  } catch (e) {
    m.success = false;
    m.error = e instanceof Error ? e.message : String(e);
  }
  
  // Sample GC periodically
  if (cycle % GC_SAMPLE_INTERVAL === 0 && typeof global.gc === 'function') {
    global.gc();
  }
  
  return m;
}

function formatMetrics(m: StressMetrics): string {
  return `Cycle ${m.cycle.toString().padStart(5)} | Heap: ${m.heapUsedMB}MB/${m.heapTotalMB}MB | GC: ${m.gcCount} (${m.gcDurationMs}ms) | Handles: ${m.activeHandles} | Listeners: ${m.activeListeners} | Import: ${m.importMs.toFixed(1)}ms | Convert: ${m.convertMs.toFixed(1)}ms | Calc: ${m.calcMs.toFixed(1)}ms | ${m.success ? '✅' : '❌ ' + m.error}`;
}

async function main() {
  console.log('=== Stress Test Started ===');
  console.log(`Builds dir: ${GOLDEN_DIR}`);
  console.log(`Target cycles: ${CYCLES}`);
  console.log(`Report interval: ${REPORT_INTERVAL}`);
  console.log(`GC sampling: every ${GC_SAMPLE_INTERVAL} cycles`);
  console.log(`Node GC exposed: ${typeof global.gc === 'function' ? 'YES' : 'NO (run with --expose-gc)'}`);
  console.log('');
  
  if (!existsSync(GOLDEN_DIR)) {
    console.error('Golden builds not found. Run fetch-pobb-builds.ts first.');
    process.exit(1);
  }
  
  const startTime = Date.now();
  let consecutiveFailures = 0;
  
  for (let cycle = 1; cycle <= CYCLES; cycle++) {
    const m = await runCycle(cycle);
    
    if (!m.success) {
      consecutiveFailures++;
      if (consecutiveFailures > 10) {
        console.error(`Too many consecutive failures (${consecutiveFailures}), stopping`);
        process.exit(1);
      }
    } else {
      consecutiveFailures = 0;
    }
    
    if (cycle % REPORT_INTERVAL === 0) {
      const elapsed = (Date.now() - startTime) / 1000 / 60;
      console.log(`${formatMetrics(m)} | Elapsed: ${elapsed.toFixed(1)}min | Rate: ${(cycle / elapsed).toFixed(1)}/min`);
    }
    
    // Memory leak detection
    if (cycle > 100 && m.heapUsedMB > 500) {
      console.warn(`⚠️  Heap > 500MB (${m.heapUsedMB}MB) — possible leak`);
    }
    
    // Handle leak detection
    if (m.activeHandles > 100) {
      console.warn(`⚠️  Active handles > 100 (${m.activeHandles}) — possible leak`);
    }
    
    // Small delay to not saturate CPU
    await new Promise(r => setTimeout(r, 1));
  }
  
  console.log('\n=== Stress Test Complete ===');
}

main().catch(console.error);