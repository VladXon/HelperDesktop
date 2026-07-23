#!/usr/bin/env node
/**
 * Run engine calculations on all golden builds
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePobXml } from '../../packages/poe-data/src/pob/pob-xml.parser.js';
import { convertPobDto } from '../../packages/poe-data/src/pob/pob-converter.js';
import { createModDB, calculateBuild, createSnapshot } from '@helper/poe-engine';
import type { ConditionState } from '../../packages/poe-engine/src/conditions/condition-expr.js';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const INPUT_DIR = resolve(__dirname, '..', '..', 'test-data', 'pobb-builds');
const OUTPUT_DIR = resolve(__dirname, '..', '..', 'test-results', 'engine-calc');
const REPORT_FILE = resolve(OUTPUT_DIR, 'engine-results.jsonl');

interface EngineResult {
  buildId: string;
  filename: string;
  character: {
    class: string;
    ascendancy: string | null;
    level: number;
  };
  stats: {
    life: number;
    energyShield: number;
    armour: number;
    evasion: number;
    blockAttack: number;
    blockSpell: number;
    spellSuppression: number;
    fireResist: number;
    coldResist: number;
    lightningResist: number;
    chaosResist: number;
    maxFireResist: number;
    maxColdResist: number;
    maxLightningResist: number;
    totalDps: number;
    hitDps: number;
    dotDps: number;
    critChance: number;
    critMultiplier: number;
    attackSpeed: number;
    castSpeed: number;
    mana: number;
    reservationPct: number;
    lifeRegen: number;
  };
  durationMs: number;
  success: boolean;
  error?: string;
}

function defaultConditionState(): ConditionState {
  return { isOnLowLife: false, isOnFullLife: true, buffs: [], curses: [] };
}

function extractStats(result: ReturnType<typeof calculateBuild>): EngineResult['stats'] {
  const stats = result.stats;
  const S = (key: string) => key; // Simplified - would use actual stat registry
  
  // Engine doesn't compute DPS directly - that's in poe-data legacy
  // For now, return defensive stats only
  return {
    life: stats.get(S('defense.life')) ?? 0,
    energyShield: stats.get(S('defense.energyShield')) ?? 0,
    armour: stats.get(S('defense.armour')) ?? 0,
    evasion: stats.get(S('defense.evasion')) ?? 0,
    blockAttack: stats.get(S('defense.blockAttack')) ?? 0,
    blockSpell: stats.get(S('defense.blockSpell')) ?? 0,
    spellSuppression: stats.get(S('defense.spellSuppression')) ?? 0,
    fireResist: stats.get(S('resistance.fire')) ?? 0,
    coldResist: stats.get(S('resistance.cold')) ?? 0,
    lightningResist: stats.get(S('resistance.lightning')) ?? 0,
    chaosResist: stats.get(S('resistance.chaos')) ?? 0,
    maxFireResist: stats.get(S('resistance.maxFire')) ?? 75,
    maxColdResist: stats.get(S('resistance.maxCold')) ?? 75,
    maxLightningResist: stats.get(S('resistance.maxLightning')) ?? 75,
    totalDps: 0, // Requires full poe-data pipeline
    hitDps: 0,
    dotDps: 0,
    critChance: stats.get(S('offense.criticalChance')) ?? 0,
    critMultiplier: stats.get(S('offense.criticalMultiplier')) ?? 0,
    attackSpeed: stats.get(S('offense.attackSpeed')) ?? 0,
    castSpeed: stats.get(S('offense.castSpeed')) ?? 0,
    mana: stats.get(S('resource.mana')) ?? 0,
    reservationPct: 0,
    lifeRegen: stats.get(S('defense.lifeRegen')) ?? 0,
  };
}

async function main() {
  console.log('=== Engine Calculation Runner ===\n');
  
  if (!existsSync(INPUT_DIR)) {
    console.error('Input dir not found:', INPUT_DIR);
    console.error('Run fetch-pobb-builds.ts first');
    process.exit(1);
  }

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const files = readdirSync(INPUT_DIR).filter(f => f.endsWith('.pob.xml'));
  console.log(`Found ${files.length} builds\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const filepath = resolve(INPUT_DIR, filename);
    
    const start = process.hrtime.bigint();
    let result: EngineResult;

    try {
      const xml = readFileSync(filepath, 'utf-8');
      const dto = parsePobXml(xml);
      const modifiers = convertPobDto(dto);
      
      const modDB = createModDB();
      modDB.addMany(modifiers);
      const snapshot = modDB.snapshot();
      
      const calcResult = calculateBuild({
        baseStats: {},
        modSnapshot: snapshot,
        conditionState: defaultConditionState(),
      });

      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      
      result = {
        buildId: filename.split('-')[0],
        filename,
        character: {
          class: dto.build.className,
          ascendancy: dto.build.ascendClassName,
          level: dto.build.level,
        },
        stats: extractStats(calcResult),
        durationMs,
        success: true,
      };
      success++;
    } catch (e) {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      result = {
        buildId: filename.split('-')[0],
        filename,
        character: { class: 'Unknown', ascendancy: null, level: 0 },
        stats: {
          life: 0, energyShield: 0, armour: 0, evasion: 0,
          blockAttack: 0, blockSpell: 0, spellSuppression: 0,
          fireResist: 0, coldResist: 0, lightningResist: 0, chaosResist: 0,
          maxFireResist: 75, maxColdResist: 75, maxLightningResist: 75,
          totalDps: 0, hitDps: 0, dotDps: 0,
          critChance: 0, critMultiplier: 0,
          attackSpeed: 0, castSpeed: 0,
          mana: 0, reservationPct: 0, lifeRegen: 0,
        },
        durationMs,
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
      failed++;
    }

    writeFileSync(REPORT_FILE, JSON.stringify(result) + '\n', { flag: 'a' });

    if (i % 25 === 0 || i === files.length - 1) {
      console.log(`  ${i + 1}/${files.length} | ✅ ${success} | ❌ ${failed} | ${result.durationMs.toFixed(1)}ms`);
    }
  }

  console.log(`\n=== Complete: Done! Results: ${REPORT_FILE}`);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});