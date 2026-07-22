import { parsePobXml } from '../src/pob/pob-xml.parser.js';
import { convertPobDto } from '../src/pob/pob-converter.js';
import { createModDB, calculateBuild } from '@helper/poe-engine';
import { performance } from 'perf_hooks';
import { readFileSync, resolve } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Use the test fixtures
const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const FIXTURES_DIR = resolve(__dirname, '..', 'src', '__tests__', 'fixtures');
const POB_XML = readFileSync(resolve(FIXTURES_DIR, 'firetrap-elementalist.pob.xml'), 'utf-8');

// Expected values from PoB Community (reference)
const POB_REFERENCE = {
  life: 6200,
  es: 1400,
  fireRes: 78,
  coldRes: 78,
  lightningRes: 78,
  chaosRes: 30,
  fireDotDps: 1500000,
  attackSpeed: 0,
  castSpeed: 2.5,
};

async function validateCalculation() {
  console.log('=== PoB Calculation Validation ===\n');
  
  // Parse and convert
  const dto = parsePobXml(POB_XML);
  const modifiers = convertPobDto(dto);
  
  console.log(`Modifiers extracted: ${modifiers.length}`);
  
  const modDB = createModDB();
  modDB.addMany(modifiers);
  const snapshot = modDB.snapshot();
  
  // Calculate with default condition state
  const result = calculateBuild({
    baseStats: {},
    modSnapshot: snapshot,
    conditionState: { 
      isOnLowLife: false, 
      isOnFullLife: true, 
      buffs: [], 
      curses: [] 
    },
  });
  
  const stats = result.stats.all();
  
  console.log('\n=== Calculated Stats ===');
  console.log(`Life: ${stats.get('defense.life') || 0} (PoB: ${POB_REFERENCE.life})`);
  console.log(`ES: ${stats.get('defense.energyShield') || 0} (PoB: ${POB_REFERENCE.es})`);
  console.log(`Fire Res: ${stats.get('resistance.fire') || 0}% (PoB: ${POB_REFERENCE.fireRes}%)`);
  console.log(`Cold Res: ${stats.get('resistance.cold') || 0}% (PoB: ${POB_REFERENCE.coldRes}%)`);
  console.log(`Lightning Res: ${stats.get('resistance.lightning') || 0}% (PoB: ${POB_REFERENCE.lightningRes}%)`);
  console.log(`Chaos Res: ${stats.get('resistance.chaos') || 0}% (PoB: ${POB_REFERENCE.chaosRes}%)`);
  console.log(`Cast Speed: ${stats.get('offense.castSpeed') || 0} (PoB: ${POB_REFERENCE.castSpeed})`);
  console.log(`Fire DoT DPS: ${stats.get('offense.fireDotDps') || 0} (PoB: ${POB_REFERENCE.fireDotDps})`);
  
  // Check for other important stats
  console.log('\n=== All Calculated Stats ===');
  for (const [key, value] of stats) {
    if (value !== 0 && value !== undefined) {
      console.log(`  ${key}: ${value}`);
    }
  }
}

validateCalculation().catch(console.error);