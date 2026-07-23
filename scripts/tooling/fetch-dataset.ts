import { decodePobCompressedData } from '../packages/poe-data/src/pob/utils/decompress.ts';
import { parsePobXml } from '../packages/poe-data/src/pob/pob-xml.parser.ts';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('test-data/pobb-builds');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const BUILDS: { id: string; note: string }[] = [
  // Maxroll-style builds (replacing outdated URLs)
  { id: 'a9IXV_SNxQHe', note: 'Earthshatter Slayer L100 [3.26]' },
  { id: 'h-si3kweTn_N', note: 'Kinetic Blast Deadeye [3.28] Fubgun endgame' },
  { id: '2OYTeDGrZCJJ', note: 'Shock Nova Archmage Hierophant [3.28]' },
  // Additional archetypes
  { id: 'oKm-Oe7m5tij', note: 'Necromancer Minion Master [3.26]' },
  { id: 'nv8Tqwq5OMvW', note: 'Toxic Rain Pathfinder (PoE Vault)' },
  { id: '2FV4DZH2wabZ', note: 'CI Crit Cold Snap Occultist L94 [3.28]' },
  { id: '4x0Dm0JKmdpx', note: 'CoC Ice Nova of Frostbolts Occultist L97 [3.28]' },
  { id: 'OKKGxj0iff7j', note: 'CI Occultist L97 [3.26]' },
  { id: 'B6eQgQiqRHf3', note: 'Toxic Rain Pathfinder L90 [3.26]' },
  // Extra melee/tank
  { id: 'tbN_O9rderTG', note: 'Earthshatter Slayer L100 alt [3.26]' },
];

async function main() {
  let fetched = 0;
  let parsed = 0;
  let failed = 0;

  for (let i = 0; i < BUILDS.length; i++) {
    const { id, note } = BUILDS[i];
    process.stdout.write(`[${i+1}/${BUILDS.length}] ${id} (${note}): `);
    try {
      const resp = await fetch(`https://pobb.in/${id}/raw`);
      if (!resp.ok) { console.log(`HTTP ${resp.status}`); failed++; continue; }
      const data = await resp.text();
      const xml = decodePobCompressedData(data, { format: 'zlib' });

      const classMatch = xml.match(/className="([^"]+)"/);
      const ascendMatch = xml.match(/ascendClassName="([^"]*)"/);
      const levelMatch = xml.match(/level="(\d+)"/);
      const className = classMatch?.[1] ?? 'Unknown';
      const ascendName = ascendMatch?.[1] ?? 'none';
      const level = levelMatch?.[1] ?? '0';

      // Parse & validate
      const parsedXml = parsePobXml(xml);
      const itemCount = parsedXml?.items?.length ?? 0;
      const gemCount = parsedXml?.gems?.length ?? 0;
      const treeNodes = parsedXml?.tree?.nodes?.length ?? 0;

      const filename = `${id}_${className}_${ascendName}_L${level}.pob.xml`;
      fs.writeFileSync(path.join(OUT_DIR, filename), xml, 'utf-8');
      console.log(` ✓ ${className}/${ascendName} L${level} | items:${itemCount} gems:${gemCount} tree:${treeNodes}`);
      fetched++;
      parsed++;
    } catch (err: any) {
      console.log(` ✗ ${err?.message ?? err}`);
      failed++;
    }
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\nDone! Fetched: ${fetched}, Parsed OK: ${parsed}, Failed: ${failed}`);
}

main().catch(console.error);
