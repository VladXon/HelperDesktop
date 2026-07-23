#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { parsePobXml } from '../packages/poe-data/src/pob/pob-xml.parser.js';
import { convertPobDto } from '../packages/poe-data/src/pob/pob-converter.js';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const INPUT_DIR = resolve(__dirname, '..', 'test-data', 'pobb-builds');
const POB_REF_DIR = resolve(__dirname, '..', 'test-results', 'pob-reference');

function loadPobReference(buildId: string): Record<string, number> | null {
  const filepath = resolve(POB_REF_DIR, `${buildId}.json`);
  if (!existsSync(filepath)) return null;
  return JSON.parse(readFileSync(filepath, 'utf-8'));
}

function printHeader(title: string) {
  console.log('\n' + '═'.repeat(60));
  console.log(`  ${title}`);
  console.log('═'.repeat(60));
}

function printRow(label: string, engine: number | string, pob: number | string) {
  const diff = typeof engine === 'number' && typeof pob === 'number' 
    ? (pob !== 0 ? ((engine - pob) / pob * 100).toFixed(1) + '%' : (engine !== 0 ? '∞' : '—'))
    : '—';
  const engStr = String(engine).padEnd(14);
  const pobStr = String(pob).padEnd(14);
  const diffStr = diff.padStart(10);
  console.log(`  ${label.padEnd(30)} ENG=${engStr} POB=${pobStr} Δ=${diffStr}`);
}

async function explainStat(buildId: string, statName: string) {
  const filename = `${buildId}.pob.xml`;
  const filepath = resolve(INPUT_DIR, filename);
  
  if (!existsSync(filepath)) {
    console.error(`Build not found: ${filename}`);
    process.exit(1);
  }

  const xml = readFileSync(filepath, 'utf-8');
  const dto = parsePobXml(xml);
  const pobRef = loadPobReference(buildId);
  const pobES = pobRef?.energyShield ?? 0;

  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║  EXPLAIN MODE: ${buildId} :: ${statName}                          ║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝`);

  // Parse and get all modifiers
  const allModifiers = convertPobDto(dto);

  // Separate by source
  const itemMods = allModifiers.filter(m => m.source === 'item' || m.source === 'implicit' || m.source === 'explicit' || m.source === 'crafted');
  const treeMods = allModifiers.filter(m => m.source === 'passiveTree' || m.source === 'ascendancy' || m.source === 'mastery' || m.source === 'keystone');
  const baseMods = allModifiers.filter(m => m.source === 'base');

  // Group item mods by item
  const itemModsByItem = new Map<string, typeof itemMods>();
  for (const m of itemMods) {
    const itemId = m.meta.itemId ?? 'unknown';
    if (!itemModsByItem.has(itemId)) itemModsByItem.set(itemId, []);
    itemModsByItem.get(itemId)!.push(m);
  }

  printHeader('1. BASE ES FROM ITEMS (final local values incl. quality + local inc + flat)');
  let totalBaseES = 0;
  for (const item of dto.items) {
    const baseES = item.baseStats?.energyShield ?? 0;
    const quality = item.quality ?? 0;
    printRow(`${item.baseType.padEnd(30)} (slot: ${item.slot ?? '?'})`, baseES, 'N/A');
    if (quality > 0) {
      console.log(`    quality ${quality}% (already in base)`);
    }
    totalBaseES += baseES;
  }
  console.log(`  Total base ES: ${totalBaseES}`);

  printHeader('2. PER-ITEM LOCAL CONTRIBUTION (baseES already includes local inc + quality + flat)');
  let totalLocalContribution = 0;
  for (const item of dto.items) {
    const baseES = item.baseStats?.energyShield ?? 0;
    if (baseES > 0) {
      totalLocalContribution += baseES;
      printRow(`${item.baseType.padEnd(30)}`, baseES, '—');
    }
  }
  console.log(`  Sum of per-item local contributions: ${totalLocalContribution}`);

  printHeader('3. GLOBAL FLAT ES (tree, jewels, ascendancy, non-item)');
  let globalFlat = 0;
  for (const m of treeMods) {
    if (m.stat.id === 'defense.energyShield' && m.type === 'flat') {
      printRow(`${m.meta.name} (${m.source})`, m.value, '—');
      globalFlat += m.value;
    }
  }
  for (const m of baseMods) {
    if (m.stat.id === 'defense.energyShield' && m.type === 'flat') {
      printRow(`${m.meta.name} (base)`, m.value, '—');
      globalFlat += m.value;
    }
  }

  printHeader('4. GLOBAL INCREASED ES (tree, ascendancy, etc.)');
  let globalInc = 0;
  for (const m of treeMods) {
    if (m.stat.id === 'defense.energyShield' && m.type === 'increased') {
      printRow(`${m.meta.name} (${m.source})`, `${m.value}%`, '—');
      globalInc += m.value;
    }
  }
  for (const m of baseMods) {
    if (m.stat.id === 'defense.energyShield' && m.type === 'increased') {
      printRow(`${m.meta.name} (base)`, `${m.value}%`, '—');
      globalInc += m.value;
    }
  }

  printHeader('5. INTELLIGENCE SCALING (floor(Int/10)% increased ES)');
  // Sum all intelligence from all sources
  const intMods = allModifiers.filter(m => m.stat.id === 'attribute.intelligence' && m.type === 'flat');
  const totalInt = intMods.reduce((a, m) => a + (m.type === 'flat' ? m.value : 0), 0);
  // Base int from class/level
  const className = dto.build.className;
  const level = dto.build.level;
  let baseInt = 0;
  switch (className) {
    case 'Witch': baseInt = 14; break;
    case 'Shadow': baseInt = 11; break;
    case 'Templar': baseInt = 12; break;
    case 'Ranger': baseInt = 7; break;
    case 'Duelist': baseInt = 7; break;
    case 'Marauder': baseInt = 6; break;
    case 'Scion': baseInt = 10; break;
  }
  const levelInt = Math.floor((level - 1) * 0.2);
  const estimatedInt = baseInt + levelInt + totalInt;
  const intIncES = Math.floor(estimatedInt / 10); // floor(Int/10)% increased ES
  printRow(`Estimated Intelligence`, estimatedInt, '—');
  printRow(`ES from INT (floor(Int/10)% inc)`, `${intIncES}% increased`, '—');

  printHeader('6. ASCENDANCY / UNIQUE / MORE / LESS');
  let moreMult = 1;
  let lessMult = 1;
  for (const m of allModifiers) {
    if (m.stat.id === 'defense.energyShield' && m.type === 'more') {
      printRow(`More: ${m.meta.name}`, `${m.value}%`, '—');
      moreMult *= (1 + m.value / 100);
    }
    if (m.stat.id === 'defense.energyShield' && m.type === 'less') {
      printRow(`Less: ${m.meta.name}`, `${m.value}%`, '—');
      lessMult *= (1 - m.value / 100);
    }
  }

  printHeader('7. FINAL CALCULATION');
  const sumBeforeGlobalInc = totalLocalContribution + globalFlat;
  printRow(`Sum of (per-item local) + global flat`, sumBeforeGlobalInc.toFixed(1), '—');
  const afterGlobalInc = sumBeforeGlobalInc * (1 + globalInc / 100);
  printRow(`× (1 + ${globalInc}% global increased)`, afterGlobalInc.toFixed(1), '—');
  // INT increased ES multiplies the total (including global increased)
  const afterInt = afterGlobalInc * (1 + intIncES / 100);
  printRow(`× (1 + ${intIncES}% INT increased)`, afterInt.toFixed(1), '—');
  const final = afterInt * moreMult * lessMult;
  printRow(`× more/less multipliers`, final.toFixed(1), pobES);
  
  if (pobES > 0) {
    const diffPct = ((final - pobES) / pobES * 100).toFixed(1);
    console.log(`\n  ⚠ ENGINE: ${final.toFixed(1)}  |  POB: ${pobES}  |  Δ: ${diffPct}%`);
    
    // Divergence analysis
    console.log('\n  ─── DIVERGENCE ANALYSIS ───');
    if (totalLocalContribution > pobES * 1.5) {
      console.log('  ⚠ Per-item local contributions exceed PoB total — likely double-counting or wrong local/glob split');
    }
    if (globalInc > 500) {
      console.log('  ⚠ Global increased ES very high — check tree inc vs item inc separation');
    }
    if (intIncES > 100) {
      console.log('  ⚠ INT contribution very high');
    }
  }
}

const [, , buildId, statName] = process.argv;
if (!buildId || !statName) {
  console.log('Usage: npx tsx scripts/golden-explain.ts <buildId> <stat>');
  console.log('Example: npx tsx scripts/golden-explain.ts OKKGxj0iff7j_Witch_Occultist_L97 EnergyShield');
  process.exit(1);
}

explainStat(buildId, statName).catch(console.error);