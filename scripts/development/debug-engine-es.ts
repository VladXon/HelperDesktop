import { readFileSync } from 'fs';
import { parsePobXml } from '../packages/poe-data/src/pob/pob-xml.parser.ts';
import { convertPobDto } from '../packages/poe-data/src/pob/pob-converter.ts';
import { createModDB } from '../packages/poe-engine/dist/src/moddb/moddb.js';
import { calculateBuild, defaultConditionState } from '../packages/poe-engine/dist/src/calculator/calculator.js';
import { S } from '@helper/poe-engine';

const xml = readFileSync('../test-data/pobb-builds/OKKGxj0iff7j_Witch_Occultist_L97.pob.xml', 'utf-8');
const dto = parsePobXml(xml);

const buildResult = convertPobDto(dto);
const allMods = buildResult;

const intMods = allMods.filter(m => m.stat.id === 'attribute.intelligence' && m.type === 'flat');
const totalInt = intMods.reduce((a, m) => a + m.value, 0);
console.log('Total INT from mods:', totalInt);

const esMods = allMods.filter(m => m.stat.id === 'defense.energyShield');
console.log('\nAll ES mods:');
for (const m of esMods) {
  console.log(`  source=${m.source} type=${m.type} stat=${m.stat.id} value=${m.value} itemId=${m.meta.itemId}`);
}

const modDB = createModDB();
modDB.addMany(allMods);
const snapshot = modDB.snapshot();

const baseStats = { 'defense.life': 0, 'resource.mana': 0 };

const calcResult = calculateBuild({
  baseStats,
  modSnapshot: snapshot,
  conditionState: defaultConditionState(),
});

const stats = calcResult.stats;
console.log('\nFinal stats:');
console.log('  life:', stats.get(S['defense.life']!));
console.log('  energyShield:', stats.get(S['defense.energyShield']!));
console.log('  int:', stats.get(S['attribute.intelligence']!));