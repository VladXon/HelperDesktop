import { readFileSync } from 'fs';
import { parsePobXml } from '../packages/poe-data/src/pob/pob-xml.parser.ts';
import { itemToModifiers, parseItemModText, stripPobPrefix } from '../packages/poe-data/src/pob/item-mod-parser.ts';
import { convertPobTree } from '../packages/poe-data/src/pob/tree-converter.ts';
import { extractCondition } from '../packages/poe-data/src/pob/condition-parser.ts';

const FILES = [
  'OKKGxj0iff7j_Witch_Occultist_L97.pob.xml',
  '4x0Dm0JKmdpx_Witch_Occultist_L97.pob.xml',
  'qO1_QpuQLeDd_Witch_Occultist_L96.pob.xml',
];

for (const fname of FILES) {
  const xml = readFileSync(`../test-data/pobb-builds/${fname}`, 'utf-8');
  const dto = parsePobXml(xml);
  const buildId = fname.split('_')[0];

  console.log(`\n========================================`);
  console.log(`ES BREAKDOWN: ${buildId}`);
  console.log(`========================================`);

  // Per-item ES breakdown
  console.log(`\n--- Per-Item ES ---`);
  let perItemTotal = 0;
  for (const item of dto.items) {
    const mods = itemToModifiers(item);
    const esBase = item.baseStats?.energyShield ?? 0;
    const esFlatMods = mods.filter(m => m.stat.id === 'defense.energyShield' && m.type === 'flat');
    const esIncMods = mods.filter(m => m.stat.id === 'defense.energyShield' && m.type === 'increased');
    const flatSum = esFlatMods.reduce((a, m) => a + m.value, 0);
    const incSum = esIncMods.reduce((a, m) => a + m.value, 0);
    const contribution = (esBase + flatSum) * (1 + incSum / 100);

    if (esBase || flatSum || incSum) {
      console.log(`  ${item.baseType.padEnd(30)} base=${String(esBase).padEnd(5)} flat=${String(flatSum).padEnd(5)} inc=${String(incSum).padEnd(5)}% → ${contribution.toFixed(2)}`);
      perItemTotal += contribution;
    }
  }
  console.log(`  ${'TOTAL'.padEnd(30)} ${'─'.repeat(23)} ${perItemTotal.toFixed(2)}`);

  // Tree ES
  console.log(`\n--- Tree ES ---`);
  const treeMods = convertPobTree(dto.tree);
  const treeEsFlat = treeMods.filter(m => m.stat.id === 'defense.energyShield' && m.type === 'flat');
  const treeEsInc = treeMods.filter(m => m.stat.id === 'defense.energyShield' && m.type === 'increased');
  const treeFlatSum = treeEsFlat.reduce((a, m) => a + m.value, 0);
  const treeIncSum = treeEsInc.reduce((a, m) => a + m.value, 0);
  console.log(`  Flat from tree: ${treeFlatSum}`);
  console.log(`  Increased from tree: ${treeIncSum}%`);

  // Final ES equation
  console.log(`\n--- ES Equation ---`);
  console.log(`  Per-item contribution: ${perItemTotal.toFixed(2)}`);
  console.log(`  Global flat (tree):   ${treeFlatSum > 0 ? `+ ${treeFlatSum}` : '- 0'}`);
  console.log(`  Total before global inc: ${(perItemTotal + treeFlatSum).toFixed(2)}`);
  console.log(`  Global inc (tree):    × ${(1 + treeIncSum / 100).toFixed(4)}`);
  const final = (perItemTotal + treeFlatSum) * (1 + treeIncSum / 100);
  console.log(`  Final ES (engine):    = ${final.toFixed(2)}`);
  console.log();
}
