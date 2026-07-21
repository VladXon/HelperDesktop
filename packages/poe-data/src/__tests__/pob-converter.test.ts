import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePobXml } from '../pob/pob-xml.parser.js';
import { convertPobDto, convertPobItems } from '../pob/pob-converter.js';
import {
  createModDB,
  createSnapshot,
  resolveModifiers,
  aggregateModifiers,
  calculateBuild,
  defaultConditionState,
  S,
} from '@helper/poe-engine';
import type { Modifier } from '@helper/poe-engine';

const TEST_DIR = resolve(fileURLToPath(import.meta.url), '..');
const FIXTURES_DIR = resolve(TEST_DIR, 'fixtures');

describe('convertPobDto', () => {
  it('converts boneshatter juggernaut PoB to modifiers', () => {
    const xml = readFileSync(resolve(FIXTURES_DIR, 'boneshatter-jugg.pob.xml'), 'utf-8');
    const dto = parsePobXml(xml);
    const modifiers = convertPobDto(dto);

    expect(modifiers.length).toBeGreaterThan(0);
    for (const mod of modifiers) {
      expect(mod.id).toBeTruthy();
      expect(mod.source).toBeTruthy();
      expect(mod.type).toBeTruthy();
      expect(mod.stat).toBeDefined();
      expect(typeof mod.value).toBe('number');
      expect(mod.meta.name).toBeTruthy();
    }
  });

  it('converts firetrap elementalist PoB to modifiers', () => {
    const xml = readFileSync(resolve(FIXTURES_DIR, 'firetrap-elementalist.pob.xml'), 'utf-8');
    const dto = parsePobXml(xml);
    const modifiers = convertPobDto(dto);

    expect(modifiers.length).toBeGreaterThan(0);
  });
});

describe('PoB modifier pipeline integration', () => {
  function runPipeline(dto: ReturnType<typeof parsePobXml>): Record<string, number> {
    const modifiers = convertPobDto(dto);

    const db = createModDB();
    db.addMany(modifiers);

    const snapshot = db.snapshot();

    const resolved = resolveModifiers([...snapshot.modifiers], defaultConditionState());

    return aggregateModifiers(resolved);
  }

  it('produces non-empty aggregated stats for boneshatter jugg', () => {
    const xml = readFileSync(resolve(FIXTURES_DIR, 'boneshatter-jugg.pob.xml'), 'utf-8');
    const dto = parsePobXml(xml);
    const stats = runPipeline(dto);

    expect(Object.keys(stats).length).toBeGreaterThan(0);
  });

  it('produces non-empty aggregated stats for firetrap elementalist', () => {
    const xml = readFileSync(resolve(FIXTURES_DIR, 'firetrap-elementalist.pob.xml'), 'utf-8');
    const dto = parsePobXml(xml);
    const stats = runPipeline(dto);

    expect(Object.keys(stats).length).toBeGreaterThan(0);
  });

  it('full pipeline: PoB XML → Modifier[] → ModDB → resolve → aggregate → ComputedStats', () => {
    const xml = readFileSync(resolve(FIXTURES_DIR, 'boneshatter-jugg.pob.xml'), 'utf-8');
    const dto = parsePobXml(xml);
    const modifiers = convertPobDto(dto);

    const db = createModDB();
    db.addMany(modifiers);

    const snapshot = db.snapshot();

    const result = calculateBuild({
      baseStats: {},
      modSnapshot: snapshot,
      conditionState: defaultConditionState(),
    });

    expect(result.stats.size).toBeGreaterThan(0);
    expect(result.layers.length).toBeGreaterThan(0);

    const lifeStat = result.stats.get(S['defense.life']);
    expect(typeof lifeStat).toBe('number');

    const fireRes = result.stats.get(S['resistance.fire']);
    expect(typeof fireRes).toBe('number');
  });

  it('handles empty PoB DTO gracefully', () => {
    const xml = '<PathOfBuilding></PathOfBuilding>';
    const dto = parsePobXml(xml);
    const modifiers = convertPobDto(dto);

    expect(modifiers).toEqual([]);

    const db = createModDB();
    const snapshot = db.snapshot();

    const result = calculateBuild({
      baseStats: {},
      modSnapshot: snapshot,
      conditionState: defaultConditionState(),
    });

    expect(result.stats.size).toBe(0);
  });

  it('handles modifiers with base stats via calculateBuild', () => {
    const xml = readFileSync(resolve(FIXTURES_DIR, 'boneshatter-jugg.pob.xml'), 'utf-8');
    const dto = parsePobXml(xml);
    const modifiers = convertPobDto(dto);

    const db = createModDB();
    db.addMany(modifiers);
    const snapshot = db.snapshot();

    const result = calculateBuild({
      baseStats: { [S['defense.life']!.id]: 1000 },
      modSnapshot: snapshot,
      conditionState: defaultConditionState(),
    });

    const life = result.stats.get(S['defense.life']);
    expect(life).toBeGreaterThan(1000);
  });
});

describe('convertPobItems (standalone)', () => {
  it('recognizes flat life modifiers', () => {
    const dto = parsePobXml('<PathOfBuilding><Items><Item id="1"><Mod text="+50 to maximum Life" explicit="true"/></Item></Items></PathOfBuilding>');
    const mods = convertPobItems(dto);

    const lifeMod = mods.find((m) => m.stat.id === 'defense.life');
    expect(lifeMod).toBeDefined();
    expect(lifeMod!.value).toBe(50);
    expect(lifeMod!.type).toBe('flat');
  });

  it('recognizes increased life modifiers', () => {
    const dto = parsePobXml('<PathOfBuilding><Items><Item id="1"><Mod text="10% increased maximum Life" explicit="true"/></Item></Items></PathOfBuilding>');
    const mods = convertPobItems(dto);

    const lifeIncMod = mods.find((m) => m.stat.id === 'defense.lifeIncreased');
    expect(lifeIncMod).toBeDefined();
    expect(lifeIncMod!.value).toBe(10);
    expect(lifeIncMod!.type).toBe('increased');
  });

  it('recognizes fire resistance modifiers', () => {
    const dto = parsePobXml('<PathOfBuilding><Items><Item id="1"><Mod text="+30% to Fire Resistance" explicit="true"/></Item></Items></PathOfBuilding>');
    const mods = convertPobItems(dto);

    const fireRes = mods.find((m) => m.stat.id === 'resistance.fire');
    expect(fireRes).toBeDefined();
    expect(fireRes!.value).toBe(30);
  });

  it('recognizes all-elemental resistance modifiers (expands to fire/cold/lightning)', () => {
    const dto = parsePobXml('<PathOfBuilding><Items><Item id="1"><Mod text="+15% to all Elemental Resistances" explicit="true"/></Item></Items></PathOfBuilding>');
    const mods = convertPobItems(dto);

    const fire = mods.filter((m) => m.stat.id === 'resistance.fire');
    const cold = mods.filter((m) => m.stat.id === 'resistance.cold');
    const lightning = mods.filter((m) => m.stat.id === 'resistance.lightning');

    expect(fire.length).toBe(1);
    expect(cold.length).toBe(1);
    expect(lightning.length).toBe(1);

    expect(fire[0]!.value).toBe(15);
    expect(cold[0]!.value).toBe(15);
    expect(lightning[0]!.value).toBe(15);
  });

  it('recognizes cold resistance modifiers', () => {
    const dto = parsePobXml('<PathOfBuilding><Items><Item id="1"><Mod text="+42% to Cold Resistance" explicit="true"/></Item></Items></PathOfBuilding>');
    const mods = convertPobItems(dto);

    const coldRes = mods.find((m) => m.stat.id === 'resistance.cold');
    expect(coldRes).toBeDefined();
    expect(coldRes!.value).toBe(42);
  });

  it('recognizes flat energy shield modifiers', () => {
    const dto = parsePobXml('<PathOfBuilding><Items><Item id="1"><Mod text="+30 to maximum Energy Shield" explicit="true"/></Item></Items></PathOfBuilding>');
    const mods = convertPobItems(dto);

    const esMod = mods.find((m) => m.stat.id === 'defense.energyShield');
    expect(esMod).toBeDefined();
    expect(esMod!.value).toBe(30);
  });

  it('recognizes increased energy shield modifiers', () => {
    const dto = parsePobXml('<PathOfBuilding><Items><Item id="1"><Mod text="20% increased maximum Energy Shield" explicit="true"/></Item></Items></PathOfBuilding>');
    const mods = convertPobItems(dto);

    const esInc = mods.find((m) => m.stat.id === 'defense.energyShieldIncreased');
    expect(esInc).toBeDefined();
    expect(esInc!.value).toBe(20);
  });

  it('recognizes flat added fire damage', () => {
    const dto = parsePobXml('<PathOfBuilding><Items><Item id="1"><Mod text="Adds 10 to 20 Fire Damage" explicit="true"/></Item></Items></PathOfBuilding>');
    const mods = convertPobItems(dto);

    const fireDmg = mods.find((m) => m.stat.id === 'offense.fireDamage');
    expect(fireDmg).toBeDefined();
    expect(fireDmg!.value).toBe(10);
    expect(fireDmg!.type).toBe('flat');
  });

  it('recognizes increased fire damage', () => {
    const dto = parsePobXml('<PathOfBuilding><Items><Item id="1"><Mod text="25% increased Fire Damage" explicit="true"/></Item></Items></PathOfBuilding>');
    const mods = convertPobItems(dto);

    const fireDmg = mods.find((m) => m.stat.id === 'offense.fireDamage');
    expect(fireDmg).toBeDefined();
    expect(fireDmg!.value).toBe(25);
    expect(fireDmg!.type).toBe('increased');
  });

  it('assigns implicit source to implicit mods', () => {
    const dto = parsePobXml('<PathOfBuilding><Items><Item id="1"><Mod text="+20 to maximum Life" implicit="true"/></Item></Items></PathOfBuilding>');
    const mods = convertPobItems(dto);

    expect(mods.length).toBeGreaterThan(0);
    expect(mods[0]!.source).toBe('implicit');
  });

  it('assigns crafted source to crafted mods', () => {
    const dto = parsePobXml('<PathOfBuilding><Items><Item id="1"><Mod text="+30 to maximum Life" crafted="true"/></Item></Items></PathOfBuilding>');
    const mods = convertPobItems(dto);

    expect(mods.length).toBeGreaterThan(0);
    expect(mods[0]!.source).toBe('crafted');
  });

  it('assigns explicit source to explicit mods', () => {
    const dto = parsePobXml('<PathOfBuilding><Items><Item id="1"><Mod text="+40 to maximum Life" explicit="true"/></Item></Items></PathOfBuilding>');
    const mods = convertPobItems(dto);

    expect(mods.length).toBeGreaterThan(0);
    expect(mods[0]!.source).toBe('explicit');
  });
});
