import { decodePobCompressedData } from '../packages/poe-data/src/pob/utils/decompress.ts';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('D:/repos/ElectronHelper/test-data/pobb-builds');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function fetchBuild(id: string): Promise<boolean> {
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
    const filepath = path.join(OUT_DIR, filename);
    fs.writeFileSync(filepath, xml);
    console.log(`  ✓ ${id} → ${filename}`);
    return true;
  } catch (e) {
    console.error(`  ✗ ${id}: ${e.message}`);
    return false;
  }
}

async function main() {
  await fetchBuild('qO1_QpuQLeDd');
  await fetchBuild('kEFJVYTEJvih');
  await fetchBuild('Vt0egZ5HIREa');
}

main().catch(console.error);