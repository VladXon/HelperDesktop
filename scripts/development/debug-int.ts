import { readFileSync } from 'fs';
import { parsePobXml } from '../packages/poe-data/src/pob/pob-xml.parser.ts';
import { convertPobDto } from '../packages/poe-data/src/pob/pob-converter.ts';

const xml = readFileSync('../test-data/pobb-builds/OKKGxj0iff7j_Witch_Occultist_L97.pob.xml', 'utf-8');
const dto = parsePobXml(xml);
const mods = convertPobDto(dto);

const intMods = mods.filter(m => m.stat.id === 'attribute.intelligence' && m.type === 'flat');
console.log('Flat INT mods:');
for (const m of intMods) {
  console.log('  source:', m.source, 'value:', m.value, 'itemId:', m.meta.itemId, 'name:', m.meta.name);
}
const totalInt = intMods.reduce((sum, m) => sum + m.value, 0);
console.log('Total INT:', totalInt);
console.log('Int inc ES (floor/10):', Math.floor(totalInt / 10));