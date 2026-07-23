import { decodePobCompressedData } from '../packages/poe-data/src/pob/utils/decompress.ts';
import fs from 'fs';
import path from 'path';

const BUILD_IDS = [
  'MorZzNuqGWuj', 'AmslEOKot_sA', '1W3mQ4oNuyn3', 'QNnjDOzZMUd_', 'CYxt9EFGKCAX',
  'TA3fuALtLIzM', '7xFoIe_bSHmZ', 'sOby0iobzmV-', 'qoKG3TKaFNbm', '7owdvyvDiCLU',
  'vjN-yOkIIHAx', 'uRkniwS82Rjf', 'v7jC_2otws0z', '8zuZRGT7Q6pd', 'kYLobj1eI5eE',
  'sPeKlDjVOg-N', 'Ug5eCnixBKx9', '3evHEFq9xJMs', 'ZUYs-7RIMen8', 'BFwBfYKgCfoD',
  'r1LSSpCw0_dB', '9FI5hUn72U0e', 'kaUutk7vwpxi', 'QrQt-xOURvUo', 'PLcbu-wEQYK-',
  'IdGBqDlX0bZU', '9QdBYIyQWhzY', 'f4WzmJkCgqf-', 'v97q7PFsb18K', 'hIXQAH4hA0AT',
  'iMDiBSt1zdve', 'wMKBs9tvHM44', 'N3UssmipQB-7', 'vUe8uinG0Ad7', 'oeVQrD5OtNHc',
  'U-I_t8KY8pB3', 'JyYd8DzvUV2k', 'OfbTUyQp-ADU', 'OwtWIUtmg-tp', '-_FYo748wKXg',
  '_oA_TeiocrXi', 'fTX4Kb68ruN6', 'qIdHH0GxjIcU', 'CocA9h3Dubgl', '8PBEhsnukpm4',
  'RDDpPVESaYOR', 'EwJoM8MtpwH-', 'lN_fHyB8AhZi', 'Z_qtWfncxwba', 'g3IJXhYopjRF',
  'AL27VJHUdH_j', 'AG5cXEGhbdsa', 'BUWaCJVCcLiX', 'AE8gDzz_k9W5', 'fK2jW9LTHJRe',
  'pJzrSATuTCLs', 'n-EMmRFxrGs9', 'G5GOOpJ1bRzD', 'Jp805GFSj33U', 'ISOMGpYfn0Cu',
  'CLdv8H73mFpi', '5yxO2VmfSld3', '99LCsx5lLoe5', '9YEozJPzNJh3', 'PNTPa2ePNER5',
  'EodRTnaaVWjk', 'g4JOl5ka8sHk', 'fcW5RuBMw2r1', 'FpvUqXcnyxky', '7H5uYgbYb4Sq',
  'qepyUb0Liv4h', 'dxX-7PClSZV9', 'IlinvwqBgdWN', 'WS9akLZdNOq8', 'cc5abrJ9Yihx',
  'Kwd0ByrcLIyn', 'UnD3TQwkcHr9', 'Ud3fyHeUBJiU', 'Q37Zo0wIMpV3', 'qE6MZG2yaCX_',
  'o-3SCOGCOTRf', 'm7NW0a7-xNrM', '4F-5WXlFA-mM', 'NfhFuRdqEyYj', 'kRfcYZMqHs0V',
  't7RYVoWq4qQa', '2531bWIEqRhU', 'Z_Il2GgfM6oZ', 'ZWTppQ4V4bUU', 'TZ8I3Sm01qdm',
  'hCsI7vndgVFA', 'OwtolRO6s_2M', 'zm5bjy_BQjlp'
];

const OUT_DIR = path.resolve('../test-data/pobb-builds');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function fetchBuild(id) {
  try {
    const response = await fetch(`https://pobb.in/${id}/raw`);
    if (!response.ok) {
      console.error(`  ${id}: HTTP ${response.status}`);
      return false;
    }
    const data = await response.text();
    const xml = decodePobCompressedData(data, { format: 'zlib' });
    
    // Extract build name for filename
    const classMatch = xml.match(/className="([^"]+)"/);
    const ascendMatch = xml.match(/ascendClassName="([^"]+)"/);
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
    
    // Rate limit
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log(`\nDone! Success: ${success}, Failed: ${failed}`);
}

main().catch(console.error);