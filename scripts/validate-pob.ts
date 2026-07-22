#!/usr/bin/env node
/**
 * PoB Validation Benchmark
 * 
 * Fetches builds from pobb.in, imports them, calculates stats,
 * and compares with PoB Community reference values.
 */

import { fromPob } from '@helper/poe-data';
import { createModDB, calculateBuild } from '@helper/poe-engine';
import type { Build, Modifier } from '@helper/poe-engine';

interface PobbBuild {
  code: string;
  name: string;
  class: string;
  level: number;
  ascendancy: string;
  mainSkill?: string;
  dps?: number;
  life?: number;
  es?: number;
  mana?: number;
  resistances?: { fire: number; cold: number; lightning: number; chaos: number };
  critChance?: number;
  critMulti?: number;
  attackSpeed?: number;
  castSpeed?: number;
  block?: number;
  spellBlock?: number;
  suppression?: number;
  armour?: number;
  evasion?: number;
}

interface ValidationResult {
  buildName: string;
  class: string;
  ascendancy: string;
  level: number;
  stats: {
    totalDps: { our: number; pob: number; diff: number; pctDiff: number };
    hitDps: { our: number; pob: number; diff: number; pctDiff: number };
    dotDps: { our: number; pob: number; diff: number; pctDiff: number };
    life: { our: number; pob: number; diff: number; pctDiff: number };
    es: { our: number; pob: number; diff: number; pctDiff: number };
    mana: { our: number; pob: number; diff: number; pctDiff: number };
    fireRes: { our: number; pob: number; diff: number; pctDiff: number };
    coldRes: { our: number; pob: number; diff: number; pctDiff: number };
    lightningRes: { our: number; pob: number; diff: number; pctDiff: number };
    chaosRes: { our: number; pob: number; diff: number; pctDiff: number };
    critChance: { our: number; pob: number; diff: number; pctDiff: number };
    critMulti: { our: number; pob: number; diff: number; pctDiff: number };
    attackSpeed: { our: number; pob: number; diff: number; pctDiff: number };
    castSpeed: { our: number; pob: number; diff: number; pctDiff: number };
    block: { our: number; pob: number; diff: number; pctDiff: number };
    spellBlock: { our: number; pob: number; diff: number; pctDiff: number };
    suppression: { our: number; pob: number; diff: number; pctDiff: number };
    armour: { our: number; pob: number; diff: number; pctDiff: number };
    evasion: { our: number; pob: number; diff: number; pctDiff: number };
    reservation: { our: number; pob: number; diff: number; pctDiff: number };
  };
  errors: string[];
}

async function fetchPobbBuilds(count: number): Promise<PobbBuild[]> {
  const builds: PobbBuild[] = [];
  const pages = Math.ceil(count / 50);
  
  for (let page = 1; page <= pages; page++) {
    try {
      const response = await fetch(`https://pobb.in/api/builds?page=${page}&limit=50`);
      const data = await response.json();
      
      for (const build of data.builds || data) {
        builds.push({
          code: build.code || build.pastebin || build.importCode,
          name: build.name || `Build ${build.id}`,
          class: build.className || build.class,
          level: build.level || 100,
          ascendancy: build.ascendancyName || build.ascendancy,
          mainSkill: build.mainSkill,
          dps: build.totalDps || build.dps,
          life: build.life,
          es: build.energyShield,
          mana: build.mana,
          resistances: build.resistances,
          critChance: build.critChance,
          critMulti: build.critMultiplier,
          attackSpeed: build.attackSpeed,
          castSpeed: build.castSpeed,
          block: build.block,
          spellBlock: build.spellBlock,
          suppression: build.spellSuppression,
          armour: build.armour,
          evasion: build.evasion,
        });
        
        if (builds.length >= count) break;
      }
      
      if (builds.length >= count) break;
    } catch (e) {
      console.error(`Failed to fetch page ${page}:`, e);
    }
  }
  
  return builds.slice(0, count);
}

function importBuild(code: string): { build: Build; modifiers: Modifier[] } | null {
  try {
    const modDB = createModDB();
    const result = fromPob(code, modDB);
    return { build: result.build, modifiers: result.modifiers };
  } catch (e) {
    console.error('Import failed:', (e as Error).message);
    return null;
  }
}

function extractOurStats(build: Build): ValidationResult['stats'] {
  // Create a minimal condition state
  const conditionState = {
    isOnConsecratedGround: false,
    isOnChilledGround: false,
    isOnShockedGround: false,
    isOnBurningGround: false,
    isOnProfaneGround: false,
    hasRecentKill: false,
    frenzyCharges: 0,
    powerCharges: 0,
    enduranceCharges: 0,
    siphoningCharges: 0,
    inspirationCharges: 0,
    blitzCharges: 0,
    isEnemyCursed: false,
    isEnemyMarked: false,
    isEnemyShocked: false,
    isEnemyIgnited: false,
    isEnemyFrozen: false,
    isEnemyChilled: false,
    isEnemyScorched: false,
    isEnemyBrittle: false,
    isEnemySapped: false,
    isEnemyHindered: false,
    isEnemyIntimidated: false,
    isEnemyBlinded: false,
    isEnemyMaimed: false,
    isEnemyBleeding: false,
    isEnemyPoisoned: false,
    isEnemyAflame: false,
    isEnemyCursedWithVulnerability: false,
    isEnemyCursedWithTemporalChains: false,
    isEnemyCursedWithElementalWeakness: false,
    isEnemyCursedWithEnfeeble: false,
    isEnemyCursedWithDespair: false,
    isEnemyCursedWithAssassinsMark: false,
    isEnemyCursedWithPoachersMark: false,
    isEnemyCursedWithWarlordsMark: false,
    isEnemyCursedWithFlammability: false,
    isEnemyCursedWithConductivity: false,
    isEnemyCursedWithFrostbite: false,
    isEnemyCursedWithSnipersMark: false,
    isEnemyCursedWithHex: false,
    isUsingFlask: false,
    flaskChargesUsed: 0,
    flaskChargesGained: 0,
    isLowLife: false,
    isFullLife: false,
    isOnLowMana: false,
    isOnFullMana: false,
    hasHitRecently: false,
    hasCritRecently: false,
    hasKilledRecently: false,
    hasUsedSkillRecently: false,
    hasCastSpellRecently: false,
    hasAttackedRecently: false,
    hasUsedMovementSkillRecently: false,
    isLeeching: false,
    isRegenerating: false,
    isOnGround: true,
    isMoving: false,
    isStationary: false,
    isChannelling: false,
    isAttacking: false,
    isCasting: false,
    isTotem: false,
    isMinion: false,
    isBrand: false,
    isTrap: false,
    isMine: false,
    isProjectile: false,
    isArea: false,
    isSpell: false,
    isAttack: false,
    isMelee: false,
    isRanged: false,
    isPhysical: false,
    isFire: false,
    isCold: false,
    isLightning: false,
    isChaos: false,
    isElemental: false,
    isHit: false,
    isCrit: false,
    isAilment: false,
    isIgnite: false,
    isPoison: false,
    isBleed: false,
    isShock: false,
    isFreeze: false,
    isChill: false,
    isScorch: false,
    isBrittle: false,
    isSap: false,
    isHinder: false,
    isIntimidate: false,
    isBlind: false,
    isMaim: false,
    isTaunted: false,
    isFeared: false,
    isFrozen: false,
    isChilled: false,
    isShocked: false,
    isIgnited: false,
    isScorched: false,
    isBrittle: false,
    isSapped: false,
    isHindered: false,
    isIntimidated: false,
    isBlinded: false,
    isMaimed: false,
    isCursed: false,
    isHexed: false,
    isMarked: false,
    isHexproof: false,
    isCurseImmune: false,
    isStunned: false,
    isHeavyStunned: false,
    isAvoidStun: false,
    isAvoidAilments: false,
    isAvoidFreeze: false,
    isAvoidChill: false,
    isAvoidShock: false,
    isAvoidIgnite: false,
    isAvoidPoison: false,
    isAvoidBleed: false,
    isAvoidCurse: false,
    isAvoidHex: false,
    isAvoidMark: false,
    isAvoidStun: false,
    isAvoidHeavyStun: false,
    isAvoidAilments: false,
    isAvoidFreeze: false,
    isAvoidChill: false,
    isAvoidShock: false,
    isAvoidIgnite: false,
    isAvoidPoison: false,
    isAvoidBleed: false,
    isAvoidCurse: false,
    isAvoidHex: false,
    isAvoidMark: false,
    isAvoidStun: false,
    isAvoidHeavyStun: false,
  };
  
  const modDB = createModDB();
  for (const mod of build.modifiers) {
    modDB.add(mod);
  }
  
  const result = calculateBuild({
    baseStats: {},
    modSnapshot: modDB.snapshot(),
    conditionState,
  });
  
  // Extract key stats
  const stats = result.stats.all();
  
  const getStat = (key: string) => stats[key] || 0;
  
  return {
    totalDps: { our: getStat('totalDps'), pob: 0, diff: 0, pctDiff: 0 },
    hitDps: { our: getStat('hitDps'), pob: 0, diff: 0, pctDiff: 0 },
    dotDps: { our: getStat('dotDps'), pob: 0, diff: 0, pctDiff: 0 },
    life: { our: getStat('life'), pob: 0, diff: 0, pctDiff: 0 },
    es: { our: getStat('energyShield'), pob: 0, diff: 0, pctDiff: 0 },
    mana: { our: getStat('mana'), pob: 0, diff: 0, pctDiff: 0 },
    fireRes: { our: getStat('fireResistance'), pob: 0, diff: 0, pctDiff: 0 },
    coldRes: { our: getStat('coldResistance'), pob: 0, diff: 0, pctDiff: 0 },
    lightningRes: { our: getStat('lightningResistance'), pob: 0, diff: 0, pctDiff: 0 },
    chaosRes: { our: getStat('chaosResistance'), pob: 0, diff: 0, pctDiff: 0 },
    critChance: { our: getStat('criticalChance'), pob: 0, diff: 0, pctDiff: 0 },
    critMulti: { our: getStat('criticalMultiplier'), pob: 0, diff: 0, pctDiff: 0 },
    attackSpeed: { our: getStat('attackSpeed'), pob: 0, diff: 0, pctDiff: 0 },
    castSpeed: { our: getStat('castSpeed'), pob: 0, diff: 0, pctDiff: 0 },
    block: { our: getStat('blockChance'), pob: 0, diff: 0, pctDiff: 0 },
    spellBlock: { our: getStat('spellBlockChance'), pob: 0, diff: 0, pctDiff: 0 },
    suppression: { our: getStat('spellSuppressionChance'), pob: 0, diff: 0, pctDiff: 0 },
    armour: { our: getStat('armour'), pob: 0, diff: 0, pctDiff: 0 },
    evasion: { our: getStat('evasion'), pob: 0, diff: 0, pctDiff: 0 },
    reservation: { our: getStat('manaReservation'), pob: 0, diff: 0, pctDiff: 0 },
  };
}

function calculateDiff(our: number, pob: number): { diff: number; pctDiff: number } {
  const diff = our - pob;
  const pctDiff = pob !== 0 ? (diff / pob) * 100 : 0;
  return { diff, pctDiff };
}

function compareStats(ourStats: ValidationResult['stats'], pobBuild: PobbBuild): ValidationResult['stats'] {
  const pobStats = {
    totalDps: pobBuild.dps || 0,
    hitDps: 0,
    dotDps: 0,
    life: pobBuild.life || 0,
    es: pobBuild.es || 0,
    mana: pobBuild.mana || 0,
    fireRes: pobBuild.resistances?.fire || 0,
    coldRes: pobBuild.resistances?.cold || 0,
    lightningRes: pobBuild.resistances?.lightning || 0,
    chaosRes: pobBuild.resistances?.chaos || 0,
    critChance: pobBuild.critChance || 0,
    critMulti: pobBuild.critMulti || 0,
    attackSpeed: pobBuild.attackSpeed || 0,
    castSpeed: pobBuild.castSpeed || 0,
    block: pobBuild.block || 0,
    spellBlock: pobBuild.spellBlock || 0,
    suppression: pobBuild.suppression || 0,
    armour: pobBuild.armour || 0,
    evasion: pobBuild.evasion || 0,
    reservation: 0,
  };
  
  const result: ValidationResult['stats'] = {} as ValidationResult['stats'];
  
  for (const key of Object.keys(ourStats) as (keyof ValidationResult['stats'])[]) {
    const our = ourStats[key].our;
    const pob = pobStats[key as keyof typeof pobStats] || 0;
    const { diff, pctDiff } = calculateDiff(our, pob);
    result[key] = { our, pob, diff, pctDiff };
  }
  
  return result;
}

async function validateBuild(build: PobbBuild): Promise<ValidationResult | null> {
  const imported = importBuild(build.code);
  if (!imported) {
    return {
      buildName: build.name,
      class: build.class,
      ascendancy: build.ascendancy,
      level: build.level,
      stats: {} as ValidationResult['stats'],
      errors: ['Import failed'],
    };
  }
  
  const ourStats = extractOurStats(imported.build);
  const stats = compareStats(ourStats, build);
  
  return {
    buildName: build.name,
    class: build.class,
    ascendancy: build.ascendancy,
    level: build.level,
    stats,
    errors: [],
  };
}

function formatResult(result: ValidationResult): string {
  const lines = [
    `=== ${result.buildName} (${result.class} / ${result.ascendancy} L${result.level}) ===`,
  ];
  
  for (const [key, stat] of Object.entries(result.stats)) {
    if (stat.pob === 0 && stat.our === 0) continue;
    const pct = stat.pctDiff.toFixed(1);
    const diff = stat.diff >= 0 ? `+${stat.diff.toFixed(1)}` : stat.diff.toFixed(1);
    lines.push(`  ${key}: our=${stat.our.toFixed(1)} pob=${stat.pob.toFixed(1)} diff=${diff} (${pct}%)`);
  }
  
  return lines.join('\n');
}

async function main() {
  const count = parseInt(process.argv[2] || '50', 10);
  
  console.log(`Fetching ${count} builds from pobb.in...`);
  const builds = await fetchPobbBuilds(count);
  console.log(`Got ${builds.length} builds`);
  
  const results: ValidationResult[] = [];
  
  for (let i = 0; i < builds.length; i++) {
    const build = builds[i];
    console.log(`\n[${i + 1}/${builds.length}] Validating: ${build.name}...`);
    
    const result = await validateBuild(build);
    if (result) {
      results.push(result);
      console.log(formatResult(result));
    }
  }
  
  // Summary
  console.log('\n\n=== SUMMARY ===');
  const statKeys = Object.keys(results[0]?.stats || {}) as (keyof ValidationResult['stats'])[];
  
  for (const key of statKeys) {
    const valid = results.filter(r => r.stats[key].pob !== 0);
    if (valid.length === 0) continue;
    
    const avgPctDiff = valid.reduce((sum, r) => sum + Math.abs(r.stats[key].pctDiff), 0) / valid.length;
    const maxPctDiff = Math.max(...valid.map(r => Math.abs(r.stats[key].pctDiff)));
    const within5 = valid.filter(r => Math.abs(r.stats[key].pctDiff) <= 5).length;
    const within10 = valid.filter(r => Math.abs(r.stats[key].pctDiff) <= 10).length;
    const within20 = valid.filter(r => Math.abs(r.stats[key].pctDiff) <= 20).length;
    
    console.log(`${key}: avgDiff=${avgPctDiff.toFixed(1)}% maxDiff=${maxPctDiff.toFixed(1)}% within5%=${within5}/${valid.length} within10%=${within10}/${valid.length} within20%=${within20}/${valid.length}`);
  }
  
  console.log(`\nTotal builds validated: ${results.length}`);
  console.log(`Failed imports: ${builds.length - results.length}`);
}

main().catch(console.error);