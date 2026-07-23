import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const INPUT_DIR = resolve(__dirname, '..', '..', 'test-data', 'pobb-builds');
const OUTPUT_DIR = resolve(__dirname, '..', '..', 'test-results', 'pob-reference');
const REPORT_FILE = resolve(OUTPUT_DIR, 'pob-results.jsonl');
const POB_REF_LUA = resolve(__dirname, '..', 'pob-ref.lua');
const LUAJIT = 'C:\\Users\\User\\AppData\\Local\\Programs\\LuaJIT\\bin\\luajit.exe';
const POB_ROOT = 'D:\\repos\\PathOfBuilding';
const POB_SRC = 'D:\\repos\\PathOfBuilding\\src';

interface PobResult {
  buildId: string; filename: string; buildName: string;
  character: { class: string; ascendancy: string; level: number };
  success: boolean; error?: string;
  stats: Record<string, number>;
}

function zeroStats(): Record<string, number> {
  return {
    Life: 0, EnergyShield: 0, Armour: 0, Evasion: 0, Ward: 0,
    FireResist: 0, ColdResist: 0, LightningResist: 0, ChaosResist: 0,
    FireResistTotal: 0, ColdResistTotal: 0, LightningResistTotal: 0, ChaosResistTotal: 0,
    Speed: 0, CastRate: 0, CritChance: 0, CritMultiplier: 0,
    BlockChance: 0, SpellBlockChance: 0, MovementSpeedMod: 0,
    SpellSuppressionChance: 0, LifeRegen: 0,
  };
}

function runPob(xmlPath: string): PobResult {
  const filename = xmlPath.split(/[/\\]/).pop()!;
  const buildId = filename.split('_')[0] || filename.replace('.pob.xml', '');

  const env = {
    ...process.env,
    LUA_PATH: `${POB_ROOT}\\runtime\\lua\\?.lua;${POB_ROOT}\\runtime\\lua\\?/init.lua;.\\?.lua;.\\?/init.lua`,
    LUA_CPATH: `${POB_ROOT}\\runtime\\?.dll;${POB_ROOT}\\runtime\\lua\\?.dll`,
  };

  try {
    const stdout = execSync(
      `"${LUAJIT}" "${POB_REF_LUA}" "${xmlPath}"`,
      { cwd: POB_SRC, timeout: 120000, windowsHide: true, env, encoding: 'utf-8' }
    );
    const data = JSON.parse(stdout.trim());
    return {
      buildId, filename,
      buildName: data.buildName || '',
      character: { class: data.className || '', ascendancy: data.ascendClassName || '', level: data.characterLevel || 0 },
      stats: data.stats || zeroStats(),
      success: true,
    };
  } catch (e: any) {
    return {
      buildId, filename, buildName: '',
      character: { class: '', ascendancy: '', level: 0 },
      stats: zeroStats(), success: false,
      error: e.stderr?.toString()?.slice(0, 500) || e.message,
    };
  }
}

async function main() {
  console.log('=== PoB Reference Runner (execSync) ===\n');
  if (!existsSync(INPUT_DIR)) { console.error('Input dir not found:', INPUT_DIR); process.exit(1); }
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  const files = readdirSync(INPUT_DIR).filter(f => f.endsWith('.pob.xml'));
  console.log(`Found ${files.length} builds\n`);
  writeFileSync(REPORT_FILE, '');

  let success = 0, failed = 0;
  for (let i = 0; i < files.length; i++) {
    const filepath = resolve(INPUT_DIR, files[i]);
    const result = runPob(filepath);
    writeFileSync(REPORT_FILE, JSON.stringify(result) + '\n', { flag: 'a' });

    if (result.success) {
      const c = result.character;
      console.log(`  ✓ [${i+1}/${files.length}] ${files[i].slice(0, 42).padEnd(44)} ${c.class} ${c.ascendancy} L${c.level}`);
      success++;
    } else {
      console.log(`  ✗ [${i+1}/${files.length}] ${files[i]}: ${result.error?.slice(0, 80)}`);
      failed++;
    }
  }
  console.log(`\n=== Complete === Success: ${success}, Failed: ${failed}`);
  console.log(`Results: ${REPORT_FILE}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
