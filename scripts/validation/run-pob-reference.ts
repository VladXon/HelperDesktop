#!/usr/bin/env node

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const INPUT_DIR = resolve(__dirname, '..', '..', 'test-data', 'pobb-builds');
const OUTPUT_DIR = resolve(__dirname, '..', '..', 'test-results', 'pob-reference');
const REPORT_FILE = resolve(OUTPUT_DIR, 'pob-results.jsonl');
const POB_REF_LUA = resolve(__dirname, '..', 'pob-ref.lua');
const LUAJIT = 'C:\\Users\\User\\AppData\\Local\\Programs\\LuaJIT\\bin\\luajit.exe';
const POB_SRC = 'D:\\repos\\PathOfBuilding\\src';
const POB_ROOT = 'D:\\repos\\PathOfBuilding';

interface PobResult {
  buildId: string;
  filename: string;
  buildName: string;
  character: { class: string; ascendancy: string; level: number };
  success: boolean;
  error?: string;
  stats: Record<string, number>;
  items?: Array<{ slot: string; name: string; baseName: string; rarity: string }>;
  raw?: string;
}

function zeroStats(): Record<string, number> {
  return {
    Life: 0, EnergyShield: 0, Armour: 0, Evasion: 0, Ward: 0,
    FireResist: 0, ColdResist: 0, LightningResist: 0, ChaosResist: 0,
    FireResistTotal: 0, ColdResistTotal: 0, LightningResistTotal: 0, ChaosResistTotal: 0,
    Speed: 0, CastRate: 0, CritChance: 0, CritMultiplier: 0,
    BlockChance: 0, SpellBlockChance: 0,
    AttackDodgeChance: 0, SpellDodgeChance: 0,
    MovementSpeedMod: 0, EffectiveMovementSpeedMod: 0,
    PhysicalDamageReduction: 0, Accuracy: 0, AccuracyHitChance: 0,
    SpellSuppressionChance: 0, LifeRegen: 0,
    TotalDPS: 0, TotalDotDPS: 0, HitChance: 0, HitSpeed: 0,
  };
}

function runPob(xmlPath: string): Promise<PobResult> {
  return new Promise((resolvePromise) => {
    const filename = xmlPath.split(/[/\\]/).pop()!;
    const buildId = filename.split('_')[0] || filename.replace('.pob.xml', '');

    const cmd = `set LUA_PATH=${POB_ROOT}\\runtime\\lua\\?.lua;${POB_ROOT}\\runtime\\lua\\?/init.lua;.\\?.lua;.\\?/init.lua & set LUA_CPATH=${POB_ROOT}\\runtime\\?.dll;${POB_ROOT}\\runtime\\lua\\?.dll & "${LUAJIT}" "${POB_REF_LUA}" "${xmlPath}"`;
    const child = spawn('cmd.exe', ['/d', '/q', '/c', cmd], {
      timeout: 120000,
      cwd: POB_SRC,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', d => stdout += d);
    child.stderr.on('data', d => stderr += d);

    child.on('close', (code) => {
      if (code !== 0 && !stdout.trim()) {
        resolvePromise({
          buildId, filename, buildName: '',
          character: { class: '', ascendancy: '', level: 0 },
          stats: zeroStats(),
          success: false,
          error: `luajit exited ${code}: ${stderr.slice(0, 500)}`,
        });
        return;
      }

      try {
        const data = JSON.parse(stdout);
        resolvePromise({
          buildId,
          filename,
          buildName: data.buildName || '',
          character: {
            class: data.className || '',
            ascendancy: data.ascendClassName || '',
            level: data.characterLevel || 0,
          },
          stats: data.stats || zeroStats(),
          items: data.items || [],
          success: true,
        });
      } catch (e) {
        resolvePromise({
          buildId, filename, buildName: '',
          character: { class: '', ascendancy: '', level: 0 },
          stats: zeroStats(),
          success: false,
          error: `Parse error: ${e}\nstdout start: ${stdout.slice(0, 200)}`,
        });
      }
    });

    child.on('error', (e) => {
      resolvePromise({
        buildId, filename, buildName: '',
        character: { class: '', ascendancy: '', level: 0 },
        stats: zeroStats(),
        success: false,
        error: `Spawn error: ${e.message}`,
      });
    });
  });
}

async function main() {
  console.log('=== PoB Reference Runner (luajit + HeadlessWrapper) ===\n');

  if (!existsSync(INPUT_DIR)) {
    console.error('Input dir not found:', INPUT_DIR);
    process.exit(1);
  }

  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  if (!existsSync(POB_REF_LUA)) {
    console.error('pob-ref.lua not found:', POB_REF_LUA);
    process.exit(1);
  }

  const files = readdirSync(INPUT_DIR).filter(f => f.endsWith('.pob.xml'));
  console.log(`Found ${files.length} builds\n`);

  writeFileSync(REPORT_FILE, '');
  let success = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    const filepath = resolve(INPUT_DIR, files[i]);
    const result = await runPob(filepath);

    writeFileSync(REPORT_FILE, JSON.stringify(result) + '\n', { flag: 'a' });

    if (result.success) {
      const c = result.character;
      console.log(`  ✓ [${i+1}/${files.length}] ${files[i].slice(0, 40).padEnd(42)} ${c.class} ${c.ascendancy} L${c.level}`);
      success++;
    } else {
      console.log(`  ✗ [${i+1}/${files.length}] ${files[i]}: ${result.error?.slice(0, 80)}`);
      failed++;
    }
  }

  console.log(`\n=== Complete ===`);
  console.log(`Success: ${success}, Failed: ${failed}`);
  console.log(`Results: ${REPORT_FILE}`);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
