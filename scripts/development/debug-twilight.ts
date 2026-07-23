import { readFileSync } from 'fs';
import { parsePobXml } from '../packages/poe-data/src/pob/pob-xml.parser.ts';

const xml = readFileSync('../test-data/pobb-builds/OKKGxj0iff7j_Witch_Occultist_L97.pob.xml', 'utf-8');
const dto = parsePobXml(xml);

// Find Twilight Regalia
const item = dto.items.find(i => i.baseType === 'Twilight Regalia');
console.log('Twilight Regalia:');
console.log('  baseStats:', JSON.stringify(item.baseStats));
console.log('  rawMods:', item.rawMods.map(m => m.text));
console.log('  quality:', item.quality);
console.log('  itemLevel:', item.itemLevel);
console.log('  rarity:', item.rarity);
console.log('  slot:', item.slot);