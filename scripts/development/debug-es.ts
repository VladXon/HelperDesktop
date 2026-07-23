import { readFileSync } from 'fs';
import { parsePobXml } from '../packages/poe-data/src/pob/pob-xml.parser.ts';
import { convertPobTree } from '../packages/poe-data/src/pob/tree-converter.ts';

const FILES = [
  'OKKGxj0iff7j_Witch_Occultist_L97.pob.xml',
];

for (const fname of FILES) {
  const xml = readFileSync(`../test-data/pobb-builds/${fname}`, 'utf-8');
  const dto = parsePobXml(xml);

  console.log(`\n=== ${fname} ===`);
  console.log(`Tree: ${dto.tree.treeVersion}, Nodes: ${dto.tree.nodes.length}`);
  console.log(`Keystones: ${dto.tree.keystones.length} - ${dto.tree.keystones.join(', ')}`);
  console.log(`Ascendancy: ${dto.tree.ascendancyNodes.join(', ')}`);
  console.log(`MasteryEffects: ${Object.keys(dto.tree.masteryEffects).length}`);

  const treeMods = convertPobTree(dto.tree);
  console.log(`\nTree modifiers: ${treeMods.length}`);
  
  const esMods = treeMods.filter(m => m.stat.id === 'defense.energyShield');
  console.log(`ES tree mods: ${esMods.length}`);
  for (const m of esMods) console.log(`  ${JSON.stringify(m)}`);

  const lifeMods = treeMods.filter(m => m.stat.id === 'defense.life');
  console.log(`Life tree mods: ${lifeMods.length}`);
  for (const m of lifeMods) console.log(`  ${JSON.stringify(m)}`);

  const maxEsMods = treeMods.filter(m => m.stat.id === 'defense.maxEnergyShield');
  console.log(`Max ES tree mods: ${maxEsMods.length}`);
  for (const m of maxEsMods) console.log(`  ${JSON.stringify(m)}`);

  // Check for keystone flags
  const mechMods = treeMods.filter(m => m.stat.id.startsWith('mechanic.'));
  console.log(`Mechanic mods: ${mechMods.length}`);
  for (const m of mechMods) console.log(`  ${JSON.stringify(m)}`);
}