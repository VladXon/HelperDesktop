import { readFileSync } from 'fs';
import { parsePobXml } from '../packages/poe-data/src/pob/pob-xml.parser.ts';
import { parseItemModText, stripPobPrefix } from '../packages/poe-data/src/pob/item-mod-parser.ts';
import { extractCondition } from '../packages/poe-data/src/pob/condition-parser.ts';

const xml = readFileSync('../test-data/pobb-builds/tbN_O9rderTG_Duelist_Slayer_L100.pob.xml', 'utf-8');
const dto = parsePobXml(xml);
console.log('Items:', dto.items.length);
let totalMods = 0;
let matched = 0;
for (const item of dto.items) {
  for (const mod of item.rawMods) {
    totalMods++;
    const cleaned = stripPobPrefix(mod.text);
    const { condition, cleanText } = extractCondition(cleaned);
    const parsed = parseItemModText(cleaned);
    if (parsed.length > 0) {
      matched++;
      if (matched <= 30) {
        console.log('  OK:', item.slot, '|', mod.text.slice(0, 80), '→', JSON.stringify(parsed));
      }
    }
  }
}
console.log('Total mods:', totalMods, 'Matched:', matched);
