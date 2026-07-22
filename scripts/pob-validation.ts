#!/usr/bin/env node
// PoB Validation Framework - fetches builds from pobb.in and runs our engine

import { createPoBParser } from '@helper/poe-data';
import { calculateBuild, createModDB, explainBuild } from '@helper/poe-engine';

interface PobBuild {
  code: string;
  url: string;
  title: string;
  className: string;
  ascendancyName: string;
  level: number;
}

interface ValidationResult {
  build: PobBuild;
  success: boolean;
  error?: string;
  ourMetrics: {
    totalDps: number;
    life: number;
    es: number;
    fireRes: number;
    coldRes: number;
    lightningRes: number;
    chaosRes: number;
    attackSpeed: number;
    castSpeed: number;
    critChance: number;
    critMultiplier: number;
    armour: number;
    evasion: number;
    blockChance: number;
    spellBlockChance: number;
    spellSuppression: number;
    offence: any;
    defence: any;
  };
  parseTimeMs: number;
  calcTimeMs: number;
  modifiersCount: number;
  skillsCount: number;
  itemsCount: number;
}

const POBB_IN_POPULAR = 'https://pobb.in/api/builds?sort=popular&limit=50';
const POBB_IN_RECENT = 'https://pobb.in/api/builds?sort=recent&limit=50';

async function fetchBuilds(url: string): Promise<PobBuild[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const data = await res.json();
  return data.builds || data || [];
}

async function fetchBuildCode(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const html = await res.text();
    // pobb.in embeds the PoB code in a data attribute or script tag
    const match = html.match(/data-pob-code="([^"]+)"/) || html.match(/"pobCode"\s*:\s*"([^"]+)"/);
    return match ? decodeURIComponent(match[1]!) : null;
  } catch {
    return null;
  }
}

async function validateBuild(build: PobBuild): Promise<ValidationResult> {
  const parseStart = performance.now();
  
  try {
    const pobCode = await fetchBuildCode(build.url);
    if (!pobCode) {
      return {
        build,
        success: false,
        error: 'Could not extract PoB code from page',
        ourMetrics: null as any,
        parseTimeMs: 0,
        calcTimeMs: 0,
        modifiersCount: 0,
        skillsCount: 0,
        itemsCount: 0,
      };
    }

    const parser = createPoBParser();
    const parseResult = parser.parse(pobCode);
    
    if (!parseResult.success || !parseResult.build) {
      return {
        build,
        success: false,
        error: `Parse failed: ${parseResult.errors?.join(', ') || 'Unknown'}`,
        ourMetrics: null as any,
        parseTimeMs: performance.now() - parseStart,
        calcTimeMs: 0,
        modifiersCount: 0,
        skillsCount: 0,
        itemsCount: 0,
      };
    }

    const parseTimeMs = performance.now() - parseStart;
    const calcStart = performance.now();

    const modDB = createModDB();
    const result = calculateBuild({
      baseStats: {},
      modSnapshot: modDB.snapshot(),
      conditionState: {},
    });

    const calcTimeMs = performance.now() - calcStart;

    // Extract our calculated metrics
    const defence = result.layers?.defence || {};
    const offence = result.layers?.offence || {};

    return {
      build,
      success: true,
      ourMetrics: {
        totalDps: offence.totalDps || 0,
        life: defence.life || 0,
        es: defence.energyShield || 0,
        fireRes: defence.resistances?.fire?.capped || 0,
        coldRes: defence.resistances?.cold?.capped || 0,
        lightningRes: defence.resistances?.lightning?.capped || 0,
        chaosRes: defence.resistances?.chaos?.capped || 0,
        attackSpeed: offence.attackSpeed || 0,
        castSpeed: offence.castSpeed || 0,
        critChance: offence.criticalChance || 0,
        critMultiplier: offence.criticalMultiplier || 0,
        armour: defence.armour || 0,
        evasion: defence.evasion || 0,
        blockChance: defence.block?.attack || 0,
        spellBlockChance: defence.block?.spell || 0,
        spellSuppression: defence.spellSuppression || 0,
        offence,
        defence,
      },
      parseTimeMs,
      calcTimeMs,
      modifiersCount: parseResult.build.modifiers?.length || 0,
      skillsCount: parseResult.build.skills?.length || 0,
      itemsCount: parseResult.build.items?.length || 0,
    };
  } catch (error) {
    return {
      build,
      success: false,
      error: (error as Error).message,
      ourMetrics: null as any,
      parseTimeMs: performance.now() - parseStart,
      calcTimeMs: 0,
      modifiersCount: 0,
      skillsCount: 0,
      itemsCount: 0,
    };
  }
}

async function runValidation() {
  console.log('Fetching popular builds from pobb.in...');
  const builds = await fetchBuilds(POBB_IN_POPULAR);
  console.log(`Found ${builds.length} builds`);

  const results: ValidationResult[] = [];
  
  for (let i = 0; i < builds.length; i++) {
    const build = builds[i];
    console.log(`\n[${i + 1}/${builds.length}] Validating: ${build.title} (${build.className} ${build.ascendancyName})`);
    
    const result = await validateBuild(build);
    results.push(result);
    
    if (result.success) {
      console.log(`  ✓ Parse: ${result.parseTimeMs.toFixed(0)}ms | Calc: ${result.calcTimeMs.toFixed(0)}ms`);
      console.log(`  DPS: ${result.ourMetrics.totalDps.toLocaleString()} | Life: ${result.ourMetrics.life} | ES: ${result.ourMetrics.es}`);
      console.log(`  Res: F${result.ourMetrics.fireRes} C${result.ourMetrics.coldRes} L${result.ourMetrics.lightningRes} Ch${result.ourMetrics.chaosRes}`);
      console.log(`  Armour: ${result.ourMetrics.armour} | Evasion: ${result.ourMetrics.evasion}`);
      console.log(`  Block: ${result.ourMetrics.blockChance}% / ${result.ourMetrics.spellBlockChance}% | Supp: ${result.ourMetrics.spellSuppression}%`);
      console.log(`  Mods: ${result.modifiersCount} | Skills: ${result.skillsCount} | Items: ${result.itemsCount}`);
    } else {
      console.log(`  ✗ Failed: ${result.error}`);
    }
  }

  // Summary
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log('\n========== VALIDATION SUMMARY ==========');
  console.log(`Total: ${results.length}`);
  console.log(`Successful: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);
  
  if (successful.length > 0) {
    const avgParse = successful.reduce((a, b) => a + b.parseTimeMs, 0) / successful.length;
    const avgCalc = successful.reduce((a, b) => a + b.calcTimeMs, 0) / successful.length;
    const avgMods = successful.reduce((a, b) => a + b.modifiersCount, 0) / successful.length;
    
    console.log(`\nPerformance:`);
    console.log(`  Avg parse time: ${avgParse.toFixed(0)}ms`);
    console.log(`  Avg calc time: ${avgCalc.toFixed(2)}ms`);
    console.log(`  Avg modifiers: ${avgMods.toFixed(0)}`);
    
    const parseTimes = successful.map(r => r.parseTimeMs).sort((a, b) => a - b);
    const calcTimes = successful.map(r => r.calcTimeMs).sort((a, b) => a - b);
    
    console.log(`\nParse time percentiles:`);
    console.log(`  p50: ${parseTimes[Math.floor(parseTimes.length * 0.5)]}ms`);
    console.log(`  p95: ${parseTimes[Math.floor(parseTimes.length * 0.95)]}ms`);
    console.log(`  p99: ${parseTimes[Math.floor(parseTimes.length * 0.99)]}ms`);
    console.log(`  max: ${parseTimes[parseTimes.length - 1]}ms`);
    
    console.log(`\nCalc time percentiles:`);
    console.log(`  p50: ${calcTimes[Math.floor(calcTimes.length * 0.5)].toFixed(2)}ms`);
    console.log(`  p95: ${calcTimes[Math.floor(calcTimes.length * 0.95)].toFixed(2)}ms`);
    console.log(`  p99: ${calcTimes[Math.floor(calcTimes.length * 0.99)].toFixed(2)}ms`);
    console.log(`  max: ${calcTimes[calcTimes.length - 1].toFixed(2)}ms`);
  }

  if (failed.length > 0) {
    console.log(`\nFailures:`);
    for (const f of failed) {
      console.log(`  - ${f.build.title}: ${f.error}`);
    }
  }

  // Save detailed results
  const fs = await import('fs');
  fs.writeFileSync('validation-results.json', JSON.stringify(results, null, 2));
  console.log('\nDetailed results saved to validation-results.json');
}

runValidation().catch(console.error);