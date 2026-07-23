import { decodePobCompressedData } from '../packages/poe-data/src/pob/utils/decompress.ts';

async function main() {
  const response = await fetch('https://pobb.in/qO1_QpuQLeDd/raw');
  const data = await response.text();
  console.log('Data length:', data.length);
  console.log('First 100 chars:', data.substring(0, 100));
  try {
    const xml = decodePobCompressedData(data, { format: 'zlib' });
    console.log('XML length:', xml.length);
    console.log('First 500 chars:', xml.substring(0, 500));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

main();