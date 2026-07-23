import { readFileSync } from 'fs';
import { parsePobXml } from '../packages/poe-data/src/pob/pob-xml.parser.ts';
import { convertPobDto } from '../packages/poe-data/src/pob/pob-converter.ts';

const xml = readFileSync('../test-data/pobb-builds/OKKGxj0iff7j_Witch_Occultist_L97.pob.xml', 'utf-8');
const dto = parsePobXml(xml);
const mods = convertPobDto(dto);

const esMods = mods.filter(m => m.stat.id === 'defense.energyShield' || m.stat.id === 'defense.energyShieldIncreased');
console.log('ES Mods (', esMods.length, '):');
for (const m of esMods) {
  console.log('  source:', m.source, 'type:', m.type, 'stat:', m.stat.id, 'value:', m.value, 'itemId:', m.meta.itemId, 'name:', m.meta.name);
}