import { parsePobXml } from '../packages/poe-data/src/pob/pob-xml.parser.js';
import { readFileSync } from 'fs';

const xml = readFileSync('./test-data/pobb-builds/boneshatter-jugg.pob.xml', 'utf-8');
console.log('XML length:', xml.length);
const dto = parsePobXml(xml);
console.log('Items:', dto.items.length);
for (const item of dto.items) {
  console.log('Item:', item.name, item.rawMods?.length);
  if (item.rawMods) {
    for (const mod of item.rawMods.slice(0, 5)) {
      console.log('  mod:', mod.text.slice(0, 120));
    }
  }
}
