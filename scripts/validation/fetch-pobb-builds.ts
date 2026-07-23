#!/usr/bin/env node
/**
 * Fetch PoB builds from pobb.in for golden testing
 * pobb.in API: https://pobb.in/api/builds?limit=500&patch=3.25
 */

import { writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const OUTPUT_DIR = resolve(__dirname, '..', '..', 'test-data', 'pobb-builds');
const POBB_API = 'https://pobb.in/api/builds';
const TARGET_COUNT = 500;
const MIN_LEVEL = 90;
const RECENT_DAYS = 30;

interface PobBuild {
  id: string;
  title: string;
  character: {
    class: string;
    ascendancy: string;
    level: number;
  };
  lastUpdated: string;
  patch: string;
  data: string; // base64 compressed
}

async function fetchBuilds(): Promise<PobBuild[]> {
  const allBuilds: PobBuild[] = [];
  let offset = 0;
  const limit = 100;
  const cutoffDate = Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000;

  console.log(`Fetching up to ${TARGET_COUNT} builds from pobb.in...`);

  while (allBuilds.length < TARGET_COUNT) {
    const url = `${POBB_API}?limit=${limit}&offset=${offset}&patch=3.25`;
    console.log(`  Page ${offset / limit + 1}: ${url}`);

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`pobb.in API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json() as { builds: PobBuild[]; total: number };
    if (!data.builds?.length) break;

    const filtered = data.builds.filter(b => 
      b.character.level >= MIN_LEVEL &&
      new Date(b.lastUpdated).getTime() >= cutoffDate
    );

    allBuilds.push(...filtered);
    console.log(`    Got ${data.builds.length} builds, ${filtered.length} passed filters (total: ${allBuilds.length})`);

    if (data.builds.length < limit) break;
    offset += limit;

    // Rate limit
    await new Promise(r => setTimeout(r, 200));
  }

  return allBuilds.slice(0, TARGET_COUNT);
}

async function saveBuild(build: PobBuild): Promise<void> {
  // Decompress the build data
  const { inflateRawSync } = await import('node:zlib');
  const { decodePobCompressedData } = await import('../packages/poe-data/src/pob/utils/decompress.js');
  
  try {
    const xml = decodePobCompressedData(build.data, { format: 'zlib' });
    
    const filename = `${build.id}-${build.character.class}-${build.character.ascendancy || 'none'}-L${build.character.level}.pob.xml`;
    const filepath = resolve(OUTPUT_DIR, filename);
    
    writeFileSync(filepath, xml, 'utf-8');
  } catch (e) {
    console.error(`Failed to save build ${build.id}:`, e);
  }
}

async function main() {
  console.log('=== pobb.in Build Fetcher ===\n');
  
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const existing = readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.pob.xml')).length;
  console.log(`Existing builds: ${existing}`);

  if (existing >= TARGET_COUNT) {
    console.log('Already have enough builds. Skipping fetch.');
    return;
  }

  const builds = await fetchBuilds();
  console.log(`\nSaving ${builds.length} builds...`);

  for (let i = 0; i < builds.length; i++) {
    await saveBuild(builds[i]);
    if (i % 25 === 0) console.log(`  ${i + 1}/${builds.length}`);
  }

  console.log(`\nDone! Builds saved to: ${OUTPUT_DIR}`);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});