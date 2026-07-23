import { readFileSync } from 'fs';
import { parsePobXml } from '../packages/poe-data/src/pob/pob-xml.parser.ts';

const xml = readFileSync('../test-data/pobb-builds/OKKGxj0iff7j_Witch_Occultist_L97.pob.xml', 'utf-8');
const dto = parsePobXml(xml);
console.log('Tree version:', dto.tree.treeVersion);
console.log('Keystones:', dto.tree.keystones);
console.log('Ascendancy nodes:', dto.tree.ascendancyNodes);