#!/usr/bin/env node
/**
 * PoB Import Performance Benchmark
 */

import { parsePobXml, convertPobDto } from '../src/pob/index.js';
import { fromPob } from '../src/legacy/factory/build-factory.js';
import { createModDB, calculateBuild } from '@helper/poe-engine';
import { performance } from 'perf_hooks';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Use the test fixture
const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const FIXTURES_DIR = resolve(__dirname, '..', 'src', '__tests__', 'fixtures');
const POB_XML = readFileSync(resolve(FIXTURES_DIR, 'firetrap-elementalist.pob.xml'), 'utf-8');

async function benchmark() {
  console.log('=== PoB Import Performance Benchmark ===\n');
  
  // Parse XML once
  const dto = parsePobXml(POB_XML);
  
  // Warmup
  for (let i = 0; i < 5; i++) {
    await fromPob(dto);
  }
  
  const iterations = 100;
  const times: number[] = [];
  let success = 0;
  let failed = 0;
  
  console.log(`Running ${iterations} imports...\n`);
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      await fromPob(dto);
      success++;
    } catch (e) {
      failed++;
    }
    const end = performance.now();
    times.push(end - start);
  }
  
  times.sort((a, b) => a - b);
  const sum = times.reduce((a, b) => a + b, 0);
  const avg = sum / times.length;
  const median = times[Math.floor(times.length / 2)];
  const p95 = times[Math.floor(times.length * 0.95)];
  const p99 = times[Math.floor(times.length * 0.99)];
  const max = times[times.length - 1];
  const min = times[0];
  
  console.log(`Results (${success} success, ${failed} failed):`);
  console.log(`  Min:    ${min.toFixed(2)}ms`);
  console.log(`  Avg:    ${avg.toFixed(2)}ms`);
  console.log(`  Median: ${median.toFixed(2)}ms`);
  console.log(`  P95:    ${p95.toFixed(2)}ms`);
  console.log(`  P99:    ${p99.toFixed(2)}ms`);
  console.log(`  Max:    ${max.toFixed(2)}ms`);
  console.log(`  Ops/s:  ${(1000 / avg).toFixed(1)}`);
  
  // Full calculation benchmark
  console.log('\n=== Full Calculation Benchmark (import + calculate) ===\n');
  
  const calcTimes: number[] = [];
  let calcSuccess = 0;
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      // Parse PoB and convert to engine modifiers
      const dto = parsePobXml(POB_XML);
      const modifiers = convertPobDto(dto);
      
      if (modifiers.length > 0) {
        const modDB = createModDB();
        modDB.addMany(modifiers);
        const snapshot = modDB.snapshot();
        calculateBuild({
          baseStats: {},
          modSnapshot: snapshot,
          conditionState: { isOnLowLife: false, isOnFullLife: true, buffs: [], curses: [] },
        });
        calcSuccess++;
      }
    } catch (e) {
      console.log('Calc error:', (e as Error).message);
    }
    calcTimes.push(performance.now() - start);
  }
  
  calcTimes.sort((a, b) => a - b);
  const calcAvg = calcTimes.reduce((a, b) => a + b, 0) / calcTimes.length;
  const calcMedian = calcTimes[Math.floor(calcTimes.length / 2)];
  const calcP95 = calcTimes[Math.floor(calcTimes.length * 0.95)];
  const calcMax = calcTimes[calcTimes.length - 1];
  
  console.log(`Results (${calcSuccess} success):`);
  console.log(`  Min:    ${calcTimes[0].toFixed(2)}ms`);
  console.log(`  Avg:    ${calcAvg.toFixed(2)}ms`);
  console.log(`  Median: ${calcMedian.toFixed(2)}ms`);
  console.log(`  P95:    ${calcP95.toFixed(2)}ms`);
  console.log(`  Max:    ${calcMax.toFixed(2)}ms`);
  console.log(`  Ops/s:  ${(1000 / calcAvg).toFixed(1)}`);
}

benchmark().catch(console.error);