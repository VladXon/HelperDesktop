import { decodePobCompressedData } from '../packages/poe-data/src/pob/utils/decompress.ts';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('../test-data/pobb-builds');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Known working build IDs
const BUILD_IDS = [
  'qO1_QpuQLeDd',  // From Reddit announcement
  'kEFJVYTEJvih',  // From GitHub issue
  'Vt0egZ5HIREa',  // Level 89 Crit Scourge Arrow Saboteur
];

async function fetchBuild(id) {
  try {
    const response = await fetch(`https://pobb.in/${id}/raw`);
    if (!response.ok) {
      console.error(`  ${id}: HTTP ${response.status}`);
      return false;
    }
    const data = await response.text();
    const xml = decodePobCompressedData(data, { format: 'zlib' });
    
    const classMatch = xml.match(/className="([^"]+)"/);
    const ascendMatch = xml.match(/ascendClassName="([^"]*)"/);
    const levelMatch = xml.match(/level="(\d+)"/);
    
    const className = classMatch ? classMatch[1] : 'Unknown';
    const ascendName = ascendMatch ? ascendMatch[1] : '';
    const level = levelMatch ? levelMatch[1] : '0';
    
    const filename = `${id}_${className}_${ascendName || 'none'}_L${level}.pob.xml`;
    fs.writeFileSync(path.join(OUT_DIR, filename), xml);
    console.log(`  ✓ ${id} → ${filename}`);
    return true;
  } catch (e) {
    console.error(`  ✗ ${id}: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log(`Fetching ${BUILD_IDS.length} builds from pobb.in...\n`);
  
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < BUILD_IDS.length; i++) {
    const id = BUILD_IDS[i];
    process.stdout.write(`[${i+1}/${BUILD_IDS.length}] ${id}: `);
    const ok = await fetchBuild(id);
    if (ok) success++;
    else failed++;
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log(`\nDone! Success: ${success}, Failed: ${failed}`);
}

main().catch(console.error);