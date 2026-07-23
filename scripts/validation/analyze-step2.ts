#!/usr/bin/env node

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

const STAT_MAP: Record<string, string> = {
  Life: 'life',
  EnergyShield: 'energyShield',
  Armour: 'armour',
  Evasion: 'evasion',
  FireResist: 'fireResist',
  ColdResist: 'coldResist',
  LightningResist: 'lightningResist',
  ChaosResist: 'chaosResist',
  CritChance: 'critChance',
  CritMultiplier: 'critMultiplier',
  Speed: 'attackSpeed',
  CastRate: 'castSpeed',
  BlockChance: 'blockChance',
  MovementSpeedMod: 'movementSpeed',
};

function loadJsonl<T>(filepath: string): T[] {
  if (!existsSync(filepath)) return [];
  return readFileSync(filepath, 'utf-8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
}

function pctDiff(a: number, b: number): number {
  if (a === 0 && b === 0) return 0;
  if (a === 0) return b !== 0 ? 9999 : 0;
  return ((b - a) / a) * 100;
}

function normalize(key: string, pobVal: number, engVal: number) {
  if (key === 'CritMultiplier') return { pob: pobVal * 100, eng: engVal };
  return { pob: pobVal, eng: engVal };
}

interface Diff { pobKey: string; pobVal: number; engVal: number; diffPct: number; absDiffPct: number; }

function main() {
  const engines = loadJsonl<EngineResult>(resolve(__dirname, '../../test-results/engine/engine-results.jsonl'));
  const pobs = loadJsonl<PobResult>(resolve(__dirname, '../../test-results/pob-reference/pob-results.jsonl'));

  console.log('\n=== Step 2 Analysis: Passive Tree Impact ===\n');

  // For each build, show detailed comparison
  for (const pob of pobs) {
    const engine = engines.find(e => e.buildId === pob.buildId);
    if (!engine) { console.log(`  No engine for ${pob.buildId}`); continue; }

    const cls = engine.character.class ?? '?';
    const lvl = engine.character.level;
    const pCls = pob.character.class ?? '?';
    const pLvl = pob.character.level;

    console.log(`── ${pob.buildId} ──`);
    console.log(`  PoB:   ${pCls} L${pLvl}`);
    console.log(`  Engine: ${cls} L${lvl}`);
    console.log();

    const diffs: Diff[] = [];

    for (const [pobKey, engKey] of Object.entries(STAT_MAP)) {
      const pVal = pob.stats[pobKey];
      const eVal = engine.stats[engKey];
      if (pVal === undefined || eVal === undefined) continue;

      const { pob: np, eng: ne } = normalize(pobKey, pVal, eVal);
      const dp = pctDiff(np, ne);
      const adp = Math.abs(dp);
      if (!isFinite(dp)) continue;

      diffs.push({ pobKey, pobVal: np, engVal: ne, diffPct: dp, absDiffPct: adp });

      // For improved stats, show new values
      const isClose = adp <= 1 ? ' ✓' : ' ✗';
      console.log(`  ${pobKey.padEnd(18)} ${isClose}  POB=${String(np).padStart(10)}  ENG=${String(ne).padStart(10)}  ${dp >= 0 ? '+ ' : '- '}${adp.toFixed(1)}%`);
    }

    if (diffs.length === 0) { console.log('  No comparable stats\n'); continue; }

    const within1pct = diffs.filter(d => d.absDiffPct <= 1).length;
    const avgError = diffs.reduce((s, d) => s + d.absDiffPct, 0) / diffs.length;
    const topGap = diffs.sort((a, b) => b.absDiffPct - a.absDiffPct)[0]!;
    console.log(`  ──`);
    console.log(`  Match: ${within1pct}/${diffs.length} (${(within1pct/diffs.length*100).toFixed(1)}%)`);
    console.log(`  Avg error: ${avgError.toFixed(1)}%`);
    console.log(`  Biggest gap: ${topGap.pobKey} (${topGap.absDiffPct.toFixed(1)}%)`);
    console.log();
  }

  // Aggregate by stat
  console.log('═══ Aggregate by Stat ═══\n');
  const statAgg: Record<string, { pobVals: number[]; engVals: number[]; diffs: number[]; absDiffs: number[] }> = {};

  for (const pob of pobs) {
    const engine = engines.find(e => e.buildId === pob.buildId);
    if (!engine) continue;
    for (const [pobKey, engKey] of Object.entries(STAT_MAP)) {
      const pVal = pob.stats[pobKey];
      const eVal = engine.stats[engKey];
      if (pVal === undefined || eVal === undefined) continue;
      const { pob: np } = normalize(pobKey, pVal, eVal);
      const ne = normalize(pobKey, pVal, eVal).eng;
      const dp = pctDiff(np, ne);
      if (!isFinite(dp)) continue;
      statAgg[pobKey] = statAgg[pobKey] || { pobVals: [], engVals: [], diffs: [], absDiffs: [] };
      statAgg[pobKey].pobVals.push(np);
      statAgg[pobKey].engVals.push(ne);
      statAgg[pobKey].diffs.push(dp);
      statAgg[pobKey].absDiffs.push(Math.abs(dp));
    }
  }

  console.log('  Stat                  Count  Avg POB    Avg ENG    Avg Error  Within 1%');
  console.log('  ───────────────────────────────────────────────────────────────────────');

  for (const [stat, data] of Object.entries(statAgg).sort(([, a], [, b]) => {
    const avgA = a.absDiffs.reduce((s, v) => s + v, 0) / a.absDiffs.length;
    const avgB = b.absDiffs.reduce((s, v) => s + v, 0) / b.absDiffs.length;
    return avgA - avgB;
  })) {
    const count = data.diffs.length;
    const avgPob = data.pobVals.reduce((s, v) => s + v, 0) / count;
    const avgEng = data.engVals.reduce((s, v) => s + v, 0) / count;
    const avgErr = data.absDiffs.reduce((s, v) => s + v, 0) / count;
    const within1 = data.absDiffs.filter(d => d <= 1).length;
    console.log(`  ${stat.padEnd(22)} ${String(count).padStart(3)}  ${avgPob.toFixed(8).padStart(10)}  ${avgEng.toFixed(8).padStart(10)}  ${avgErr.toFixed(6).padStart(8)}%  ${within1}/${count}`);
  }

  // Top 20 gaps across all builds
  console.log('\n═══ Top 20 Largest Gaps ═══\n');
  const allDiffs: { build: string; stat: string; pob: number; eng: number; diffPct: number; absDiff: number }[] = [];

  for (const pob of pobs) {
    const engine = engines.find(e => e.buildId === pob.buildId);
    if (!engine) continue;
    for (const [pobKey, engKey] of Object.entries(STAT_MAP)) {
      const pVal = pob.stats[pobKey];
      const eVal = engine.stats[engKey];
      if (pVal === undefined || eVal === undefined) continue;
      const { pob: np, eng: ne } = normalize(pobKey, pVal, eVal);
      const dp = pctDiff(np, ne);
      if (!isFinite(dp)) continue;
      allDiffs.push({ build: pob.buildId.replace('.pob.xml', '').slice(0, 20), stat: pobKey, pob: np, eng: ne, diffPct: dp, absDiff: Math.abs(dp) });
    }
  }

  allDiffs.sort((a, b) => b.absDiff - a.absDiff);
  console.log('  #  Build                Stat          POB         Engine      Diff%');
  for (let i = 0; i < Math.min(20, allDiffs.length); i++) {
    const d = allDiffs[i];
    const pobS = d.pob >= 1000 ? d.pob.toFixed(0) : d.pob.toFixed(2);
    const engS = d.eng >= 1000 ? d.eng.toFixed(0) : d.eng.toFixed(2);
    console.log(`  ${String(i+1).padStart(2)}  ${d.build.padEnd(20)} ${d.stat.padEnd(12)} ${pobS.padStart(10)} ${engS.padStart(10)} ${d.diffPct >= 0 ? '+ ' : '- '}${d.absDiff.toFixed(1)}%`);
  }

  // Root cause classification
  console.log('\n═══ Root Cause Classification ═══\n');
  console.log('  Gap Category              Count  Avg Error  Primary Stats');
  console.log('  ─────────────────────────────────────────────────────────');

  const categories = [
    { name: 'Missing item mods', pattern: (s: string) => ['Life', 'EnergyShield', 'Armour', 'Evasion', 'Speed', 'CritChance', 'CastRate'].includes(s) },
    { name: 'Resist model / act penalty', pattern: (s: string) => s.includes('Resist') },
    { name: 'Skill base data', pattern: (s: string) => ['Speed', 'CastRate'].includes(s) },
    { name: 'MovementSpeed unimplemented', pattern: (s: string) => s === 'MovementSpeedMod' },
    { name: 'CritMultiplier normalization', pattern: (s: string) => s === 'CritMultiplier' },
  ];

  for (const cat of categories) {
    const items = allDiffs.filter(d => cat.pattern(d.stat));
    if (items.length === 0) continue;
    const avg = items.reduce((s, d) => s + d.absDiff, 0) / items.length;
    const stats = [...new Set(items.map(d => d.stat))].join(', ');
    console.log(`  ${cat.name.padEnd(28)} ${String(items.length).padStart(3)}   ${avg.toFixed(1).padStart(8)}%  ${stats}`);
  }

  // Conclusion
  console.log('\n═══ Conclusion ═══\n');

  // Per-build improvement
  for (const pob of pobs) {
    const engine = engines.find(e => e.buildId === pob.buildId);
    if (!engine) continue;
    const diffs_ = allDiffs.filter(d => d.build === pob.buildId.replace('.pob.xml', '').slice(0, 20));
    const lifeDiff = diffs_.find(d => d.stat === 'Life');
    if (lifeDiff) {
      const engLife = pob.stats.Life ? engine.stats.life : 0;
      const pobLife = pob.stats.Life ?? 0;
      console.log(`  ${pob.buildId.slice(0, 25).padEnd(28)} Life: POB=${pobLife}  ENG=${engLife}  gap=${lifeDiff.absDiff.toFixed(1)}%`);
    }
  }
}

main();
