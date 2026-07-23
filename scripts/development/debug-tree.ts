import { parsePobXml } from '../packages/poe-data/src/pob/pob-xml.parser.js';
import { convertPobTree } from '../packages/poe-data/src/pob/tree-converter.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const xml = readFileSync(resolve('test-data/pobb-builds/kEFJVYTEJvih_Templar_Hierophant_L94.pob.xml'), 'utf-8');
const dto = parsePobXml(xml);
console.log('Templar build:');
console.log('  Tree version:', dto.tree.treeVersion);
console.log('  Allocated nodes:', dto.tree.nodes.length);

const mods = convertPobTree(dto.tree);
console.log('  Generated modifiers:', mods.length);

// Group by stat
const byStat: Record<string, number> = {};
for (const m of mods) {
  const key = `${m.stat.id} (${m.type})`;
  byStat[key] = (byStat[key] || 0) + 1;
}
console.log('  Modifiers by stat:');
for (const [k, v] of Object.entries(byStat).sort()) {
  console.log(`    ${k}: ${v}`);
}

// Check qO1
const xml2 = readFileSync(resolve('test-data/pobb-builds/qO1_QpuQLeDd_Witch_Occultist_L96.pob.xml'), 'utf-8');
const dto2 = parsePobXml(xml2);
console.log('\nWitch build:');
console.log('  Tree version:', dto2.tree.treeVersion);
console.log('  Allocated nodes:', dto2.tree.nodes.length);
const mods2 = convertPobTree(dto2.tree);
console.log('  Generated modifiers:', mods2.length);
const byStat2: Record<string, number> = {};
for (const m of mods2) {
  const key = `${m.stat.id} (${m.type})`;
  byStat2[key] = (byStat2[key] || 0) + 1;
}
console.log('  Modifiers by stat:');
for (const [k, v] of Object.entries(byStat2).sort()) {
  console.log(`    ${k}: ${v}`);
}
