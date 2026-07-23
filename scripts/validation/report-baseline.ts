#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENGINE_FILE = resolve(__dirname, '..', '..', 'test-results', 'engine', 'engine-results.jsonl');
const POB_FILE = resolve(__dirname, '..', '..', 'test-results', 'pob-reference', 'pob-results.jsonl');
const HISTORY_DIR = resolve(__dirname, '..', '..', 'docs', 'validation', 'history');

interface EngineResult {
  buildId: string; filename: string; success: boolean; error?: string;
  character: { class: string; ascendancy: string | null; level: number };
  stats: Record<string, number>;
}

interface PobResult {
  buildId: string; filename: string; success: boolean; error?: string;
  character: { class: string; ascendancy: string; level: number };
  stats: Record<string, number>;
}

/** Builds with invalid data — excluded from accuracy metrics */
const EXCLUDED_BUILDS = new Set(['boneshatter-jugg.pob.xml', 'firetrap-elementalist.pob.xml', 'Vt0egZ5HIREa']);

const STAT_MAP: Record<string, string> = {
  Life: 'life',
  EnergyShield: 'energyShield',
  Armour: 'armour',
  Evasion: 'evasion',
  FireResistTotal: 'rawFireResist',    // Use raw (uncapped) for comparison
  ColdResistTotal: 'rawColdResist',
  LightningResistTotal: 'rawLightningResist',
  ChaosResistTotal: 'rawChaosResist',
  CritChance: 'critChancePercent',
  CritMultiplier: 'critMultiplierPercent',
  Speed: 'attackSpeed',
  CastRate: 'castSpeed',
  BlockChance: 'blockChance',
  SpellBlockChance: 'spellBlockChance',
  SpellSuppressionChance: 'spellSuppressionChance',
  LifeRegen: 'lifeRegen',
  MovementSpeedMod: 'movementSpeedMod',
  AccuracyHitChance: 'accuracyHitChance',
};

function loadJsonl<T>(filepath: string): T[] {
  if (!existsSync(filepath)) return [];
  return readFileSync(filepath, 'utf-8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
}

function normalize(pobKey: string, pobVal: number, engVal: number): { pob: number; eng: number } {
  // CritMultiplier: PoB uses decimal (3.97 = 397%), Engine uses flat (150 = 150%)
  if (pobKey === 'CritMultiplier') return { pob: pobVal * 100, eng: engVal };
  return { pob: pobVal, eng: engVal };
}

function pctDiff(a: number, b: number): number {
  if (a === 0 && b === 0) return 0;
  if (a === 0) return b !== 0 ? Infinity : 0;
  return ((b - a) / a) * 100;
}

interface DiffEntry {
  buildId: string; pobKey: string; engKey: string;
  pobVal: number; engVal: number; diffPct: number; absDiffPct: number;
}

function main() {
  const engines = loadJsonl<EngineResult>(ENGINE_FILE);
  const pobs = loadJsonl<PobResult>(POB_FILE);

  const allDiffs: DiffEntry[] = [];
  const statStats: Record<string, { total: number; absErrorPct: number }> = {};
  const buildStats: Record<string, { total: number; match: number; absErrorPct: number }> = {};
  let totalComparisons = 0;
  let totalMatch = 0;
  let totalAbsErrorPct = 0;

  const validPobs = pobs.filter(p => !EXCLUDED_BUILDS.has(p.buildId) && p.success);

  for (const pob of validPobs) {
    const engine = engines.find(e => e.buildId === pob.buildId);
    if (!engine) continue;

    buildStats[pob.buildId] = { total: 0, match: 0, absErrorPct: 0 };
    let buildErrorSum = 0;

    for (const [pobKey, engKey] of Object.entries(STAT_MAP)) {
      const pVal = pob.stats[pobKey];
      const eVal = engine.stats[engKey];
      if (pVal === undefined || eVal === undefined) continue;

      const { pob: np, eng: ne } = normalize(pobKey, pVal, eVal);
      const dp = pctDiff(np, ne);
      const adp = Math.abs(dp);

      if (!isFinite(dp) || isNaN(dp)) continue;

      allDiffs.push({
        buildId: pob.buildId, pobKey, engKey,
        pobVal: np, engVal: ne, diffPct: dp, absDiffPct: adp,
      });

      buildStats[pob.buildId].total++;
      buildErrorSum += adp;
      if (adp <= 1.0) buildStats[pob.buildId].match++;

      statStats[pobKey] = statStats[pobKey] || { total: 0, absErrorPct: 0 };
      statStats[pobKey].total++;
      statStats[pobKey].absErrorPct += adp;

      totalComparisons++;
      totalAbsErrorPct += adp;
      if (adp <= 1.0) totalMatch++;
    }

    buildStats[pob.buildId].absErrorPct = buildStats[pob.buildId].total > 0
      ? buildErrorSum / buildStats[pob.buildId].total : Infinity;
  }

  // Sort by abs diff descending for top-10
  const top10 = [...allDiffs].sort((a, b) => b.absDiffPct - a.absDiffPct).slice(0, 10);

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  let md = `# Golden Test Baseline Report v0.1\n\n`;
  md += `**Date:** ${dateStr}\n`;
  md += `**Builds tested:** ${pobs.length} (${validPobs.length} valid, ${pobs.length - validPobs.length} excluded — Format B tree / classId mismatch)\n`;
  md += `**Total comparisons:** ${totalComparisons}\n`;
  md += `**Overall accuracy:** ${totalComparisons > 0 ? (totalMatch / totalComparisons * 100).toFixed(1) : 'N/A'}%\n`;
  md += `**Mean absolute error:** ${totalComparisons > 0 ? (totalAbsErrorPct / totalComparisons).toFixed(2) : 'N/A'}%\n\n`;

  md += `## Results\n\n`;

  md += `### Accuracy by Stat\n\n`;
  md += `| Stat | Comparisons | Within 1% | Accuracy | Mean Error |\n`;
  md += `|------|-------------|-----------|----------|------------|\n`;

  for (const [stat, s] of Object.entries(statStats).sort(([, a], [, b]) => (a.absErrorPct / a.total) - (b.absErrorPct / b.total))) {
    const acc = s.total > 0 ? (s.absErrorPct <= s.total * 1.0 ? ((s.total - (s.absErrorPct > 1 ? s.total : 0)) / s.total) * 100 : 0) : 0;
    // Recalculate properly
    const matchCount = allDiffs.filter(d => d.pobKey === stat && d.absDiffPct <= 1.0).length;
    const accuracy = s.total > 0 ? (matchCount / s.total * 100).toFixed(1) : '0';
    const meanErr = s.total > 0 ? (s.absErrorPct / s.total).toFixed(2) : '0';
    md += `| ${stat.padEnd(25)} | ${String(s.total).padEnd(11)} | ${String(matchCount).padEnd(9)} | ${accuracy}% | ${meanErr}% |\n`;
  }

  md += `\n### Top-10 Largest Discrepancies\n\n`;
  md += `| # | Build | Stat | PoB | Engine | Diff% |\n`;
  md += `|---|-------|------|-----|--------|-------|\n`;

  for (let i = 0; i < top10.length; i++) {
    const d = top10[i];
    const pobStr = d.pobVal >= 1000 ? d.pobVal.toFixed(0) : d.pobVal.toFixed(2);
    const engStr = d.engVal >= 1000 ? d.engVal.toFixed(0) : d.engVal.toFixed(2);
    md += `| ${i + 1} | ${d.buildId.slice(0, 20).padEnd(20)} | ${d.pobKey.padEnd(22)} | ${pobStr.padEnd(10)} | ${engStr.padEnd(10)} | ${d.diffPct.toFixed(1)}% |\n`;
  }

  md += `\n### Per-Build Summary\n\n`;
  md += `| Build | Class | Level | Comparisons | Pass | Accuracy | Mean Error | Status |\n`;
  md += `|-------|-------|-------|-------------|------|----------|------------|--------|\n`;

  for (const pob of pobs) {
    const engine = engines.find(e => e.buildId === pob.buildId);
    const isExcluded = EXCLUDED_BUILDS.has(pob.buildId);
    const bs = buildStats[pob.buildId];
    if (!bs) {
      md += `| ${pob.buildId.slice(0, 20).padEnd(20)} | ${(pob.character.class || '?').padEnd(10)} | ${String(pob.character.level).padEnd(5)} | — | — | — | — | ${isExcluded ? 'EXCLUDED' : ''} |\n`;
      continue;
    }
    const acc = bs.total > 0 ? (bs.match / bs.total * 100).toFixed(1) : '0';
    const err = bs.total > 0 ? bs.absErrorPct.toFixed(2) : '—';
    const cls = engine?.character.class || pob.character.class || '?';
    md += `| ${pob.buildId.slice(0, 20).padEnd(20)} | ${cls.padEnd(10)} | ${String(pob.character.level).padEnd(5)} | ${String(bs.total).padEnd(11)} | ${String(bs.match).padEnd(4)} | ${acc}% | ${err}% | ${isExcluded ? 'EXCLUDED' : ''} |\n`;
  }

  md += `\n### Notes\n\n`;
  md += `- CritMultiplier normalized: PoB decimal → percentage (×100).\n`;
  md += `- Resists compared on raw values (engine caps displayed at 75%, but raw provides actual).\n`;
  md += `- MovementSpeedMod: Engine outputs 0 (base). PoB includes boots + passives.\n`;
  md += `- Speed: Engine shows base attack speed. PoB shows main skill speed with all modifiers.\n`;
  md += `- CastRate compared against castSpeed when available.\n`;
  md += `- Excluded builds have Format B tree (Base64) or classId mismatch — can't parse tree.\n`;

  // Save report
  if (!existsSync(HISTORY_DIR)) mkdirSync(HISTORY_DIR, { recursive: true });
  const reportPath = resolve(HISTORY_DIR, `${dateStr}-baseline-v0.1.md`);
  writeFileSync(reportPath, md);
  console.log(`Report saved: ${reportPath}`);
  console.log(md);
}

main();
