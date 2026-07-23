import { decodePobCompressedData } from '../packages/poe-data/src/pob/utils/decompress.ts';
import { parsePobXml } from '../packages/poe-data/src/pob/pob-xml.parser.ts';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('test-data/pobb-builds');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const BUILDS: { id: string; name: string }[] = [
  { id: 'nw2tPY0Zx5zq', name: 'Earthshatter Slayer' },
  { id: 'g1WvwCBVNfFs', name: 'Kinetic Blast Deadeye' },
  { id: 'NV7O1dYNHvHZ', name: 'Shock Nova Archmage Hierophant' },
];

async function main() {
  for (const build of BUILDS) {
    console.log(`\n=== ${build.name} (${build.id}) ===`);
    try {
      const resp = await fetch(`https://pobb.in/${build.id}/raw`);
      if (!resp.ok) { console.error(`  HTTP ${resp.status}`); continue; }
      const data = await resp.text();
      const xml = decodePobCompressedData(data, { format: 'zlib' });

      const classMatch = xml.match(/className="([^"]+)"/);
      const ascendMatch = xml.match(/ascendClassName="([^"]*)"/);
      const levelMatch = xml.match(/level="(\d+)"/);
      const className = classMatch?.[1] ?? 'Unknown';
      const ascendName = ascendMatch?.[1] ?? 'none';
      const level = levelMatch?.[1] ?? '0';

      // Validate by parsing
      const parsed = parsePobXml(xml);
      if (!parsed) {
        console.error(`  FAILED to parse XML`);
        continue;
      }

      const filename = `${build.id}_${className}_${ascendName}_L${level}.pob.xml`;
      fs.writeFileSync(path.join(OUT_DIR, filename), xml, 'utf-8');
      console.log(`  Class: ${className}/${ascendName} L${level}`);
      console.log(`  Items: ${parsed.items?.length ?? 0}, Skills: ${parsed.skills?.length ?? 0}`);
      console.log(`  Gems: ${parsed.gems?.length ?? 0}`);
      console.log(`  Saved: ${filename}`);
    } catch (err) {
      console.error(`  ERROR: ${err}`);
    }
  }
}

main().catch(console.error);
