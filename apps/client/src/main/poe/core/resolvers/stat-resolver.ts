import type { Modifier, ComputedItemStats, DamageRange } from '../models/index.js';

interface ParsedMod {
  category: ModCategory;
  value: number;
  subkey?: string;
}

type ModCategory =
  | 'life' | 'mana' | 'energyShield' | 'armour' | 'evasion' | 'ward'
  | 'fireResist' | 'coldResist' | 'lightningResist' | 'chaosResist'
  | 'maxFireResist' | 'maxColdResist' | 'maxLightningResist'
  | 'strength' | 'dexterity' | 'intelligence'
  | 'flatPhysicalDamage' | 'flatFireDamage' | 'flatColdDamage' | 'flatLightningDamage' | 'flatChaosDamage'
  | 'increasedDamage' | 'castSpeed' | 'attackSpeed'
  | 'criticalChance' | 'criticalMultiplier' | 'spellSuppression'
  | 'attackBlock' | 'spellBlock' | 'lifeRegen' | 'lifeOnBlock' | 'movementSpeed'
  | 'lifeRegenPercent' | 'increasedLife' | 'increasedES' | 'increasedArmour' | 'increasedEvasion'
  | 'addedLife' | 'addedES' | 'addedMana'
  | 'addsPhysicalDamage' | 'addsFireDamage' | 'addsColdDamage' | 'addsLightningDamage' | 'addsChaosDamage'
  | 'elementalResistances' | 'allResistances'
  | 'elementalDamageWithAttacks' | 'spellDamage' | 'attackDamage'
  | 'globalCriticalChance' | 'globalCriticalMultiplier'
  | 'unknown';

const MOD_PATTERNS: Array<{ regex: RegExp; category: ModCategory; factor?: number }> = [
  { regex: /^\+(\d+(?:\.\d+)?)\s+to\s+maximum\s+life$/i, category: 'life' },
  { regex: /^\+(\d+(?:\.\d+)?)\s+to\s+maximum\s+mana$/i, category: 'mana' },
  { regex: /^\+(\d+(?:\.\d+)?)\s+to\s+maximum\s+energy\s+shield$/i, category: 'energyShield' },
  { regex: /^\+(\d+(?:\.\d+)?)\s+to\s+armour$/i, category: 'armour' },
  { regex: /^\+(\d+(?:\.\d+)?)\s+to\s+evasion\s+rating$/i, category: 'evasion' },
  { regex: /^\+(\d+(?:\.\d+)?)\s+to\s+ward$/i, category: 'ward' },
  { regex: /^\+(\d+(?:\.\d+)?)%\s+to\s+fire\s+resistance$/i, category: 'fireResist' },
  { regex: /^\+(\d+(?:\.\d+)?)%\s+to\s+cold\s+resistance$/i, category: 'coldResist' },
  { regex: /^\+(\d+(?:\.\d+)?)%\s+to\s+lightning\s+resistance$/i, category: 'lightningResist' },
  { regex: /^\+(\d+(?:\.\d+)?)%\s+to\s+chaos\s+resistance$/i, category: 'chaosResist' },
  { regex: /^\+(\d+(?:\.\d+)?)%\s+to\s+maximum\s+fire\s+resistance$/i, category: 'maxFireResist' },
  { regex: /^\+(\d+(?:\.\d+)?)%\s+to\s+maximum\s+cold\s+resistance$/i, category: 'maxColdResist' },
  { regex: /^\+(\d+(?:\.\d+)?)%\s+to\s+maximum\s+lightning\s+resistance$/i, category: 'maxLightningResist' },
  { regex: /^\+(\d+(?:\.\d+)?)\s+to\s+strength$/i, category: 'strength' },
  { regex: /^\+(\d+(?:\.\d+)?)\s+to\s+dexterity$/i, category: 'dexterity' },
  { regex: /^\+(\d+(?:\.\d+)?)\s+to\s+intelligence$/i, category: 'intelligence' },
  { regex: /^\+(\d+(?:\.\d+)?)\s+to\s+all\s+attributes$/i, category: 'strength', factor: 1 },
  { regex: /^\+(\d+(?:\.\d+)?)%\s+to\s+all\s+elemental\s+resistances$/i, category: 'allResistances' },
  { regex: /^\+(\d+(?:\.\d+)?)%\s+to\s+elemental\s+resistances$/i, category: 'elementalResistances' },
  { regex: /^(\d+(?:\.\d+)?)%\s+increased\s+cast\s+speed$/i, category: 'castSpeed' },
  { regex: /^(\d+(?:\.\d+)?)%\s+increased\s+attack\s+speed$/i, category: 'attackSpeed' },
  { regex: /^\+(\d+(?:\.\d+)?)%\s+to\s+critical\s+strike\s+chance$/i, category: 'criticalChance' },
  { regex: /^\+(\d+(?:\.\d+)?)%\s+to\s+critical\s+strike\s+multiplier$/i, category: 'criticalMultiplier' },
  { regex: /^\+(\d+(?:\.\d+)?)%\s+chance\s+to\s+suppress\s+spell\s+damage$/i, category: 'spellSuppression' },
  { regex: /^\+(\d+(?:\.\d+)?)%\s+chance\s+to\s+block\s+attack\s+damage$/i, category: 'attackBlock' },
  { regex: /^\+(\d+(?:\.\d+)?)%\s+chance\s+to\s+block\s+spell\s+damage$/i, category: 'spellBlock' },
  { regex: /^recover\s+(\d+(?:\.\d+)?)%\s+of\s+life\s+when\s+you\s+block/i, category: 'lifeOnBlock' },
  { regex: /^\+(\d+(?:\.\d+)?)\s+life\s+when\s+you\s+block/i, category: 'lifeOnBlock' },
  { regex: /^\+(\d+(?:\.\d+)?)%\s+to\s+movement\s+speed$/i, category: 'movementSpeed' },
  { regex: /^regenerate\s+(\d+(?:\.\d+)?)%\s+of\s+life\s+per\s+second/i, category: 'lifeRegenPercent' },
  { regex: /^\+(\d+(?:\.\d+)?)\s+life\s+regenerated\s+per\s+second/i, category: 'lifeRegen' },
  { regex: /^\+(\d+(?:\.\d+)?)%\s+increased\s+maximum\s+life$/i, category: 'increasedLife' },
  { regex: /^\+(\d+(?:\.\d+)?)%\s+increased\s+maximum\s+energy\s+shield$/i, category: 'increasedES' },
  { regex: /^\+(\d+(?:\.\d+)?)%\s+increased\s+armour$/i, category: 'increasedArmour' },
  { regex: /^\+(\d+(?:\.\d+)?)%\s+increased\s+evasion\s+rating$/i, category: 'increasedEvasion' },
  { regex: /^adds\s+(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)\s+physical\s+damage/i, category: 'addsPhysicalDamage' },
  { regex: /^adds\s+(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)\s+fire\s+damage/i, category: 'addsFireDamage' },
  { regex: /^adds\s+(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)\s+cold\s+damage/i, category: 'addsColdDamage' },
  { regex: /^adds\s+(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)\s+lightning\s+damage/i, category: 'addsLightningDamage' },
  { regex: /^adds\s+(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)\s+chaos\s+damage/i, category: 'addsChaosDamage' },
  { regex: /^\+(\d+(?:\.\d+)?)%\s+to\s+global\s+critical\s+strike\s+chance$/i, category: 'globalCriticalChance' },
  { regex: /^\+(\d+(?:\.\d+)?)%\s+to\s+global\s+critical\s+strike\s+multiplier$/i, category: 'globalCriticalMultiplier' },
  { regex: /^(\d+(?:\.\d+)?)%\s+increased\s+elemental\s+damage\s+with\s+attack\s+skills$/i, category: 'elementalDamageWithAttacks' },
  { regex: /^(\d+(?:\.\d+)?)%\s+increased\s+spell\s+damage$/i, category: 'spellDamage' },
];

function parseSingleMod(text: string): ParsedMod {
  for (const { regex, category, factor } of MOD_PATTERNS) {
    const match = regex.exec(text);
    if (match) {
      const value = factor !== undefined
        ? parseFloat(match[1]!) * factor
        : parseFloat(match[1]!);
      return { category, value };
    }
  }
  return { category: 'unknown', value: 0 };
}

function sum(numbers: number[]): number {
  return numbers.reduce((a, b) => a + b, 0);
}

function max(numbers: number[]): number {
  return numbers.length > 0 ? Math.max(...numbers) : 0;
}

function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return sum(numbers) / numbers.length;
}

function isEquipmentSlot(slot: string): boolean {
  const equipmentSlots = new Set([
    'helm', 'amulet', 'chest', 'ring1', 'ring2', 'belt',
    'gloves', 'boots', 'mainHand', 'offHand',
  ]);
  return equipmentSlots.has(slot);
}

function isFlaskSlot(slot: string): boolean {
  return /^flask\d?$/.test(slot);
}

export function aggregateMods(mods: Modifier[]): ComputedItemStats {
  const parsed = mods.map((m) => parseSingleMod(m.name));
  const byCategory = new Map<ModCategory, number[]>();
  for (const p of parsed) {
    const arr = byCategory.get(p.category) ?? [];
    arr.push(p.value);
    byCategory.set(p.category, arr);
  }

  const g = (cat: ModCategory) => sum(byCategory.get(cat) ?? []);
  const ga = (cat: ModCategory) => average(byCategory.get(cat) ?? []);

  const flatDamage: DamageRange[] = [];
  const dmgMap: Record<string, { min: number; max: number }> = {
    physical: { min: 0, max: 0 },
    fire: { min: 0, max: 0 },
    cold: { min: 0, max: 0 },
    lightning: { min: 0, max: 0 },
    chaos: { min: 0, max: 0 },
  };

  for (const m of mods) {
    const text = m.name;
    const dmgTypes: Array<{ prefix: string; key: keyof typeof dmgMap; typeName: string }> = [
      { prefix: 'physical', key: 'physical', typeName: 'physical damage' },
      { prefix: 'fire', key: 'fire', typeName: 'fire damage' },
      { prefix: 'cold', key: 'cold', typeName: 'cold damage' },
      { prefix: 'lightning', key: 'lightning', typeName: 'lightning damage' },
      { prefix: 'chaos', key: 'chaos', typeName: 'chaos damage' },
    ];

    for (const dt of dmgTypes) {
      const dmgRegex = new RegExp(
        `adds\\s+(\\d+(?:\\.\\d+)?)\\s+to\\s+(\\d+(?:\\.\\d+)?)\\s+${dt.typeName.replace(/\s/g, '\\s')}`,
        'i',
      );
      const dmgMatch = dmgRegex.exec(text);
      if (dmgMatch) {
        dmgMap[dt.key]!.min += parseFloat(dmgMatch[1]!);
        dmgMap[dt.key]!.max += parseFloat(dmgMatch[2]!);
      }
    }
  }

  for (const [type, range] of Object.entries(dmgMap)) {
    if (range.min > 0 || range.max > 0) {
      flatDamage.push({ type: type as DamageRange['type'], min: range.min, max: range.max });
    }
  }

  const increasedDamage: Record<string, number> = {};
  const damageMods = byCategory.get('increasedDamage') ?? [];
  const elementalAttackDmg = g('elementalDamageWithAttacks');
  const spellDmg = g('spellDamage');
  const attackDmg = g('attackDamage');

  if (elementalAttackDmg > 0) increasedDamage['elemental_attack'] = elementalAttackDmg;
  if (spellDmg > 0) increasedDamage['spell'] = spellDmg;
  if (attackDmg > 0) increasedDamage['attack'] = attackDmg;

  const implicits = mods.filter((m) => m.domain === 'implicit');
  const explicits = mods.filter((m) => m.domain === 'explicit');
  const crafts = mods.filter((m) => m.domain === 'crafted');

  return {
    armour: g('armour'),
    evasion: g('evasion'),
    energyShield: g('energyShield'),
    ward: g('ward'),
    life: g('life') + g('addedLife'),
    mana: g('mana') + g('addedMana'),
    resistances: {
      fire: g('fireResist') + g('allResistances') + g('elementalResistances'),
      cold: g('coldResist') + g('allResistances') + g('elementalResistances'),
      lightning: g('lightningResist') + g('allResistances') + g('elementalResistances'),
      chaos: g('chaosResist'),
    },
    maxResistances: {
      fire: g('maxFireResist'),
      cold: g('maxColdResist'),
      lightning: g('maxLightningResist'),
    },
    attributes: {
      str: g('strength'),
      dex: g('dexterity'),
      int: g('intelligence'),
    },
    flatDamage,
    increasedDamage,
    castSpeed: g('castSpeed'),
    attackSpeed: g('attackSpeed'),
    criticalChance: g('criticalChance') + g('globalCriticalChance'),
    criticalMultiplier: g('criticalMultiplier') + g('globalCriticalMultiplier'),
    spellSuppression: g('spellSuppression'),
    blockChance: {
      attack: g('attackBlock'),
      spell: g('spellBlock'),
    },
    lifeRegen: g('lifeRegen'),
    onBlockGain: g('lifeOnBlock'),
    movementSpeed: g('movementSpeed'),
    implicits,
    explicits,
    crafts,
  };
}

export function resolveBuildStats(items: Array<{ slot: string; computedStats: ComputedItemStats; rawMods: Modifier[] }>): ComputedItemStats {
  const equipment = items.filter((i) => isEquipmentSlot(i.slot));
  const aggregated = aggregateMods(equipment.flatMap((i) => i.rawMods));

  return aggregated;
}

export function resolveItemStats(mods: Modifier[]): ComputedItemStats {
  return aggregateMods(mods);
}
