import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENGINE_FILE = resolve(__dirname, '..', 'test-results', 'engine', 'engine-results.jsonl');
const POB_FILE = resolve(__dirname, '..', 'test-results', 'pob-reference', 'pob-results.jsonl');
const BASELINE_FILE = resolve(__dirname, '..', 'test-results', 'golden-tests', 'baseline.json');
const EXPLAIN_DIR = resolve(__dirname, '..', 'test-results', 'explain');

interface BaselineEntry {
  buildId: string;
  stats: Record<string, number>;
}

/** Regression thresholds. */
const REGRESSION_WORSE_THAN = 5;    // % worse than baseline → warning
const NEW_OVERCALC_THRESHOLD = 20;  // % over PoB → warning

function loadBaseline(): BaselineEntry[] {
  if (!existsSync(BASELINE_FILE)) return [];
  return JSON.parse(readFileSync(BASELINE_FILE, 'utf-8'));
}

function saveBaseline(baseline: BaselineEntry[]): void {
  writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2));
}

function checkRegressions(
  buildId: string,
  engineStats: Record<string, number>,
  pobStats: Record<string, number>,
  baseline: BaselineEntry[]
): { regressions: string[]; newOvercalcs: string[] } {
  const regressions: string[] = [];
  const newOvercalcs: string[] = [];
  const base = baseline.find(b => b.buildId === buildId);

  for (const [statKey, engVal] of Object.entries(engineStats)) {
    const pobVal = pobStats[statKey];
    if (pobVal === undefined || pobVal === 0) continue;

    const diffPct = ((engVal - pobVal) / pobVal) * 100;
    const isOvercalc = diffPct > 0;

    if (base && base.stats[statKey] !== undefined) {
      const baseDiff = ((base.stats[statKey] - pobVal) / pobVal) * 100;
      if (diffPct - baseDiff > REGRESSION_WORSE_THAN) {
        regressions.push(`${statKey}: ${diffPct.toFixed(1)}% vs baseline ${baseDiff.toFixed(1)}% (Δ+${(diffPct - baseDiff).toFixed(1)}%)`);
      }
    }

    if (isOvercalc && diffPct > NEW_OVERCALC_THRESHOLD) {
      newOvercalcs.push(`${statKey}: ${diffPct.toFixed(1)}% over PoB`);
    }
  }
  return { regressions, newOvercalcs };
}

/** Generate explain file for stats with >20% error. */
async function generateExplainIfNeeded(
  buildId: string,
  engineStats: Record<string, number>,
  pobStats: Record<string, number>
): Promise<void> {
  const EXPLAIN_THRESHOLD = 20; // percent

  const highErrorStats: string[] = [];
  for (const [pobKey, entry] of Object.entries(STAT_MAP)) {
    const engKey = entry.engKey;
    const engVal = engineStats[engKey];
    const pobVal = pobStats[pobKey];
    if (engVal === undefined || pobVal === undefined || pobVal === 0) continue;
    const diffPct = Math.abs(((engineStats[engKey] - pobVal) / pobVal) * 100);
    if (diffPct > EXPLAIN_THRESHOLD) {
      highErrorStats.push(pobKey);
    }
  }

  if (highErrorStats.length === 0) return;

  // Ensure explain dir exists
  if (!existsSync(EXPLAIN_DIR)) {
    mkdirSync(EXPLAIN_DIR, { recursive: true });
  }

  // Generate explain file
  const explainPath = resolve(EXPLAIN_DIR, `${buildId}.md`);
  let content = `# Explain: ${buildId}\n\n`;
  content += `Generated: ${new Date().toISOString()}\n\n`;
  content += `## High-Error Stats (>20%)\n\n`;

  for (const stat of highErrorStats) {
    const entry = STAT_MAP[stat];
    const eng = engineStats[entry.engKey];
    const pob = pobStats[stat];
    const diffPct = ((eng - pob) / pob * 100).toFixed(1);
    content += `- **${stat}**: Engine=${eng}, PoB=${pob}, Δ=${diffPct >= 0 ? '+' : ''}${diffPct}%\n`;
  }

  content += `\n---\n\n`;
  content += `Run \`npx tsx scripts/golden-explain.ts ${buildId} EnergyShield\` for full breakdown.\n`;

  writeFileSync(explainPath, content);
  console.log(`  📝 Generated explain: ${explainPath}`);
}

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

/** Builds with invalid data (Format B tree, classId mismatch) — excluded from accuracy but shown separately. */
const EXCLUDED_BUILDS = new Set(['boneshatter-jugg.pob.xml', 'firetrap-elementalist.pob.xml', 'Vt0egZ5HIREa']);

const STAT_MAP: Record<string, {engKey: string; display: (eng: number, pob: number, allStats: Record<string, number>) => {pob: number; eng: number; label: string}}> = {
  Life: { engKey: 'life', display: simpleDisplay },
  EnergyShield: { engKey: 'energyShield', display: simpleDisplay },
  Armour: { engKey: 'armour', display: simpleDisplay },
  Evasion: { engKey: 'evasion', display: simpleDisplay },
  FireResistTotal: { engKey: 'fireResistCurrent', display: resistanceDisplay('fireResistCurrent', 'maxFireResist') },
  ColdResistTotal: { engKey: 'coldResistCurrent', display: resistanceDisplay('coldResistCurrent', 'maxColdResist') },
  LightningResistTotal: { engKey: 'lightningResistCurrent', display: resistanceDisplay('lightningResistCurrent', 'maxLightningResist') },
  ChaosResistTotal: { engKey: 'chaosResistCurrent', display: resistanceDisplay('chaosResistCurrent', 'maxChaosResist') },
  CritChance: { engKey: 'critChance', display: simpleDisplay },
  CritMultiplier: { engKey: 'critMultiplier', display: (e, p) => ({ pob: p * 100, eng: e, label: '' }) },
  Speed: { engKey: 'attackSpeed', display: simpleDisplay },
  CastRate: { engKey: 'castSpeed', display: simpleDisplay },
  BlockChance: { engKey: 'blockChance', display: simpleDisplay },
  SpellBlockChance: { engKey: 'spellBlockChance', display: simpleDisplay },
  MovementSpeedMod: { engKey: 'movementSpeed', display: simpleDisplay },
  SpellSuppressionChance: { engKey: 'spellSuppressionChance', display: simpleDisplay },
  LifeRegen: { engKey: 'lifeRegen', display: simpleDisplay },
  AccuracyHitChance: { engKey: 'accuracyHitChance', display: simpleDisplay },
};

function simpleDisplay(e: number, p: number): { pob: number; eng: number; label: string } {
  return { pob: p, eng: e, label: '' };
}

function resistanceDisplay(currentKey: string, maxKey: string) {
  return (e: number, p: number, allStats: Record<string, number>): { pob: number; eng: number; label: string } => {
    const maxRes = allStats[maxKey] ?? 0;
    return { pob: p, eng: e, label: `current=${e} max=${maxRes}` };
  };
}



function loadJsonl<T>(filepath: string): T[] {
  if (!existsSync(filepath)) return [];
  return readFileSync(filepath, 'utf-8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
}

async function main() {
  const engines = loadJsonl<EngineResult>(ENGINE_FILE);
  const pobs = loadJsonl<PobResult>(POB_FILE);
  const baseline = loadBaseline();

  console.log('=== Engine vs PoB Comparison ===\n');

  const allStats = Object.keys(STAT_MAP);

  let totalMatchGlobal = 0, totalCountGlobal = 0;
  let totalRegressions = 0, totalOvercalcs = 0;

  for (const pob of pobs) {
    const engine = engines.find(e => e.buildId === pob.buildId);
    if (!engine) { console.log(`  No engine result for ${pob.buildId}`); continue; }
    if (!pob.success) { console.log(`  ✗ ${pob.buildId}: PoB failed`); continue; }

    const isExcluded = EXCLUDED_BUILDS.has(pob.buildId);
    const tag = isExcluded ? ' [EXCLUDED — invalid tree data]' : '';
    console.log(`\n--- ${pob.buildId}${tag} ---`);
    console.log(`  Class: ${engine.character.class}/${pob.character.class}  Level: ${engine.character.level}/${pob.character.level}`);

    let matchCount = 0, totalCount = 0;

    for (const [pobKey, entry] of Object.entries(STAT_MAP)) {
      const pVal = pob.stats[pobKey];
      const eVal = engine.stats[entry.engKey];
      if (pVal === undefined || eVal === undefined) continue;
      totalCount++;

      const { pob: np, eng: ne, label } = entry.display(eVal, pVal, engine.stats);
      const isZeroMatch = (np === 0 && ne === 0);
      let diffPct = np !== 0 ? ((ne - np) / np) * 100 : (ne !== 0 ? Infinity : 0);
      const status = isZeroMatch || (isFinite(diffPct) && Math.abs(diffPct) <= 1) ? '✓' : '✗';
      if (!isFinite(diffPct) || isNaN(diffPct)) diffPct = 0;

      if (status === '✓') matchCount++;
      const extra = label ? ` [${label}]` : '';
      console.log(`  ${status} ${pobKey.padEnd(20)} POB=${String(np).padEnd(12)} ENG=${String(ne).padEnd(12)} ${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(2)}%${extra}`);
    }

    const { regressions, newOvercalcs } = checkRegressions(pob.buildId, engine.stats, pob.stats, baseline);
    if (regressions.length) {
      console.log(`  ⚠ REGRESSIONS:`);
      for (const r of regressions) console.log(`    - ${r}`);
      totalRegressions += regressions.length;
    }
    if (newOvercalcs.length) {
      console.log(`  ⚠ NEW OVER-CALCULATIONS:`);
      for (const o of newOvercalcs) console.log(`    - ${o}`);
      totalOvercalcs += newOvercalcs.length;
    }

    const rate = totalCount > 0 ? (matchCount / totalCount * 100).toFixed(1) : '0';
    console.log(`  → ${matchCount}/${totalCount} match (${rate}%)`);

    if (!isExcluded) {
      totalMatchGlobal += matchCount;
      totalCountGlobal += totalCount;
    }

    // Auto-generate explain for high-error stats
    await generateExplainIfNeeded(pob.buildId, engine.stats, pob.stats);

    // Update baseline for this build
    const existingIdx = baseline.findIndex(b => b.buildId === pob.buildId);
    if (existingIdx >= 0) baseline[existingIdx].stats = engine.stats;
    else baseline.push({ buildId: pob.buildId, stats: engine.stats });
  }

  saveBaseline(baseline);

  const validCount = pobs.filter(p => !EXCLUDED_BUILDS.has(p.buildId) && p.success).length;
  console.log(`\n=== Summary (${validCount} valid builds) ===`);
  console.log(`  Overall: ${totalMatchGlobal}/${totalCountGlobal} (${totalCountGlobal > 0 ? (totalMatchGlobal / totalCountGlobal * 100).toFixed(1) : 'N/A'}%)`);
  if (totalRegressions) console.log(`  ⚠ ${totalRegressions} regression(s) detected`);
  if (totalOvercalcs) console.log(`  ⚠ ${totalOvercalcs} new over-calculation(s) detected`);
}

main();
