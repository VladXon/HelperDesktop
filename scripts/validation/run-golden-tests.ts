#!/usr/bin/env node
/**
 * Golden Test Runner — Compare Engine vs PoB Community
 * 
 * For each pobb.in build:
 * 1. Parse PoB XML
 * 2. Run through our engine (pob-converter → poe-engine)
 * 3. Compare key stats against PoB's calculated values (from PoB XML config)
 * 4. Generate markdown report with pass/fail per build
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePobXml } from '@helper/poe-data/pob';
import { fromPob } from '@helper/poe-data/legacy/factory/build-factory';
import { analyze } from '@helper/poe-data/legacy/engine/analyzer.engine';
import { createModDB, calculateBuild } from '@helper/poe-engine';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const GOLDEN_DIR = resolve(__dirname, '..', 'golden-builds');
const REPORT_DIR = resolve(__dirname, '..', 'golden-reports');
const TOLERANCE_PCT = 1.0; // 1% tolerance

interface PoBConfigValues {
  life?: number;
  energyShield?: number;
  mana?: number;
  totalDps?: number;
  hitDps?: number;
  dotDps?: number;
  critChance?: number;
  critMultiplier?: number;
  attackSpeed?: number;
  castSpeed?: number;
  fireResist?: number;
  coldResist?: number;
  lightningResist?: number;
  chaosResist?: number;
  armour?: number;
  evasion?: number;
  blockChance?: number;
  spellBlockChance?: number;
  spellSuppression?: number;
}

interface ComparisonResult {
  buildId: string;
  buildName: string;
  className: string;
  ascendancy: string;
  level: number;
  stats: Record<string, { pob: number; engine: number; diff: number; diffPct: number; pass: boolean }>;
  passed: number;
  total: number;
  passRate: number;
}

function extractPoBConfigValues(xml: string): PoBConfigValues {
  // Parse Config section for PoB's calculated values
  const configMatch = xml.match(/<Config>([\s\S]*?)<\/Config>/i);
  if (!configMatch) return {};
  
  const config = configMatch[1];
  const values: PoBConfigValues = {};
  
  const inputRegex = /<Input\b[^>]*name="([^"]+)"[^>]*number="([^"]+)"[^>]*\/?>/gi;
  let match: RegExpExecArray | null;
  
  while ((match = inputRegex.exec(config)) !== null) {
    const name = match[1].toLowerCase();
    const value = parseFloat(match[2]);
    if (isNaN(value)) continue;
    
    // Map PoB config names to our stat names
    const mapping: Record<string, keyof PoBConfigValues> = {
      'life': 'life',
      'energyshield': 'energyShield',
      'mana': 'mana',
      'totaldps': 'totalDps',
      'hitdps': 'hitDps',
      'dotdps': 'dotDps',
      'critchance': 'critChance',
      'critmultiplier': 'critMultiplier',
      'attackspeed': 'attackSpeed',
      'castspeed': 'castSpeed',
      'fireresist': 'fireResist',
      'coldresist': 'coldResist',
      'lightningresist': 'lightningResist',
      'chaosresist': 'chaosResist',
      'armour': 'armour',
      'evasion': 'evasion',
      'blockchance': 'blockChance',
      'spellblockchance': 'spellBlockChance',
      'spellsuppression': 'spellSuppression',
    };
    
    const key = mapping[name];
    if (key) values[key] = value;
  }
  
  return values;
}

function extractEngineValues(build: ReturnType<typeof fromPob>, analysis: ReturnType<typeof analyze>): Record<string, number> {
  const defense = analysis.facts.defense;
  const offense = analysis.facts.offense;
  
  return {
    life: defense.life,
    energyShield: defense.energyShield,
    mana: 0, // Not yet calculated in engine
    totalDps: offense.totalDps,
    hitDps: offense.mainSkill.averageHit * offense.mainSkill.hitRate,
    dotDps: offense.dotDps || 0,
    critChance: offense.critChance * 100,
    critMultiplier: offense.critMultiplier * 100,
    attackSpeed: offense.attackSpeed,
    castSpeed: offense.castSpeed || offense.attackSpeed,
    fireResist: defense.resistances.fire.capped,
    coldResist: defense.resistances.cold.capped,
    lightningResist: defense.resistances.lightning.capped,
    chaosResist: defense.resistances.chaos.capped,
    armour: defense.armour,
    evasion: defense.evasion,
    blockChance: defense.block.attack,
    spellBlockChance: defense.block.spell,
    spellSuppression: defense.spellSuppression,
  };
}

function compareStats(pob: PoBConfigValues, engine: Record<string, number>): ComparisonResult['stats'] {
  const keys = new Set([...Object.keys(pob), ...Object.keys(engine)]);
  const result: ComparisonResult['stats'] = {};
  
  for (const key of keys) {
    const pobVal = pob[key as keyof PoBConfigValues];
    const engVal = engine[key];
    
    if (pobVal === undefined || engVal === undefined) continue;
    if (pobVal === 0 && engVal === 0) continue; // Skip zeros
    
    const diff = engVal - pobVal;
    const diffPct = pobVal !== 0 ? (diff / pobVal) * 100 : 0;
    const pass = Math.abs(diffPct) <= TOLERANCE_PCT;
    
    result[key] = {
      pob: pobVal,
      engine: engVal,
      diff,
      diffPct,
      pass,
    };
  }
  
  return result;
}

function formatValue(val: number): string {
  if (val >= 1000000) return (val / 1000000).toFixed(2) + 'M';
  if (val >= 1000) return (val / 1000).toFixed(1) + 'k';
  return val.toFixed(2);
}

function generateMarkdownReport(results: ComparisonResult[]): string {
  const totalBuilds = results.length;
  const totalStats = results.reduce((sum, r) => sum + r.total, 0);
  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
  const overallPassRate = totalStats > 0 ? (totalPassed / totalStats * 100).toFixed(1) : '0';
  
  let md = `# Golden Test Report — Engine vs PoB Community\n\n`;
  md += `**Date:** ${new Date().toISOString()}\n`;
  md += `**Tolerance:** ±${TOLERANCE_PCT}%\n`;
  md += `**Builds Tested:** ${totalBuilds}\n`;
  md += `**Total Comparisons:** ${totalStats}\n`;
  md += `**Passed:** ${totalPassed} (${overallPassRate}%)\n\n`;
  
  md += `## Summary by Build\n\n`;
  md += `| Build | Class | Level | Comparisons | Passed | Pass Rate |\n`;
  md += `|-------|-------|-------|-------------|--------|-----------|\n`;
  
  for (const r of results.sort((a, b) => b.passRate - a.passRate)) {
    md += `| ${r.buildName} | ${r.className} ${r.ascendancy || ''} | ${r.level} | ${r.total} | ${r.passed} | ${r.passRate.toFixed(1)}% |\n`;
  }
  
  md += `\n## Detailed Comparisons\n\n`;
  
  for (const r of results) {
    md += `### ${r.buildName} (${r.className}${r.ascendancy ? ' ' + r.ascendancy : ''}, L${r.level})\n\n`;
    md += `| Stat | PoB | Engine | Diff | Diff % | Status |\n`;
    md += `|------|-----|--------|------|--------|--------|\n`;
    
    for (const [stat, data] of Object.entries(r.stats).sort((a, b) => Math.abs(b[1].diffPct) - Math.abs(a[1].diffPct))) {
      const status = data.pass ? '✅' : '❌';
      md += `| ${stat} | ${formatValue(data.pob)} | ${formatValue(data.engine)} | ${formatValue(data.diff)} | ${data.diffPct >= 0 ? '+' : ''}${data.diffPct.toFixed(2)}% | ${status} |\n`;
    }
    md += `\n`;
  }
  
  return md;
}

async function main() {
  console.log('=== Golden Test Runner ===\n');
  
  if (!existsSync(GOLDEN_DIR)) {
    console.error(`Golden builds dir not found: ${GOLDEN_DIR}`);
    console.error('Run fetch-pobb-builds.ts first');
    process.exit(1);
  }
  
  if (!existsSync(REPORT_DIR)) {
    mkdirSync(REPORT_DIR, { recursive: true });
  }
  
  const files = readdirSync(GOLDEN_DIR).filter(f => f.endsWith('.pob.xml'));
  console.log(`Found ${files.length} PoB builds\n`);
  
  const results: ComparisonResult[] = [];
  let processed = 0;
  let failed = 0;
  
  for (const file of files) {
    try {
      const xml = readFileSync(resolve(GOLDEN_DIR, file), 'utf-8');
      const dto = parsePobXml(xml);
      const build = fromPob(dto);
      const analysis = analyze(build);
      
      const pobValues = extractPoBConfigValues(xml);
      const engineValues = extractEngineValues(build, analysis);
      const stats = compareStats(pobValues, engineValues);
      
      const passed = Object.values(stats).filter(s => s.pass).length;
      const total = Object.keys(stats).length;
      const passRate = total > 0 ? (passed / total * 100) : 0;
      
      // Extract build ID from filename
      const buildId = file.split('_')[0];
      
      results.push({
        buildId,
        buildName: dto.build.ascendClassName ? `${dto.build.ascendClassName} ${dto.build.className}` : dto.build.className,
        className: dto.build.className,
        ascendancy: dto.build.ascendClassName || '',
        level: dto.build.level,
        stats,
        passed,
        total,
        passRate,
      });
      
      processed++;
      if (processed % 20 === 0) {
        console.log(`  Processed ${processed}/${files.length}...`);
      }
    } catch (e) {
      console.error(`  Failed: ${file}`, e);
      failed++;
    }
  }
  
  const reportMd = generateMarkdownReport(results);
  const reportPath = resolve(REPORT_DIR, `golden-report-${Date.now()}.md`);
  writeFileSync(reportPath, reportMd);
  
  console.log(`\n=== Complete ===`);
  console.log(`Processed: ${processed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Report: ${reportPath}`);
  
  // Also output JSON for CI
  const jsonPath = resolve(REPORT_DIR, `golden-report-${Date.now()}.json`);
  writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`JSON: ${jsonPath}`);
}

main().catch(console.error);