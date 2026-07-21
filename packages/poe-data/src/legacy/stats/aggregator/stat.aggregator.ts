import type { ResolvedCharacterStats, TracedDefenseStats } from '../models/character-stats.model.js';
import { emptyDefense, emptyOffense, emptyMechanics, emptyAttributes } from '../models/character-stats.model.js';
import type { StatValue } from '../models/stat.model.js';
import { makeTracedStat, addToTracedStat } from '../models/stat.model.js';
import type { EquippedItem } from '@helper/shared';
import type { SkillSetup } from '../../skills/models/skill.model.js';
import type { PassiveTree } from '../../tree/models/passive-tree.model.js';
import { collectItemStats } from '../collectors/item.collector.js';
import { collectSkillStats } from '../collectors/skill.collector.js';
import { collectTreeStats } from '../collectors/tree.collector.js';
import { resolveModifiers } from '../resolvers/modifier.resolver.js';
import { applyKeystoneEffects } from '../resolvers/keystone.resolver.js';

/**
 * Calculation Pipeline:
 *
 *   Items + Skills + Tree
 *        │
 *        ▼
 *   Collectors  →  StatValue[] (raw, flat)
 *        │
 *        ▼
 *   resolveModifiers  →  { flat, increased, more, conversions }
 *        │
 *        ├── Base stats ────→ applyIncreased() ──→ applyMore()
 *        │
 *        ├── Conversions ──→ Enemy mitigation (penetration, resistance)
 *        │
 *        └── Keystone overrides (CI, MoM, EB)
 *        │
 *        ▼
 *   ResolvedCharacterStats { defense, offense, mechanics, attributes, traced }
 *
 * Pipeline stages (for calculators, Phase 3f):
 *   1. Base     — flat values from gear, tree, character
 *   2. Flat     — sum of all additive flat stats
 *   3. Conversion — phys→light→cold→fire→chaos
 *   4. Increased — sum all % increased modifiers
 *   5. More     — multiply all more multipliers
 *   6. Crit     — apply crit chance + multi
 *   7. Enemy mitigation — resistances, armour reduction, boss penalties
 */

export interface AggregatorInput {
  items: EquippedItem[];
  skills: SkillSetup[];
  tree: PassiveTree;
}

const TRACED_STAT_NAMES = [
  'life', 'energyShield', 'mana', 'armour', 'evasion',
  'fireResistance', 'coldResistance', 'lightningResistance', 'chaosResistance',
  'attackBlock', 'spellBlock', 'lifeRegen', 'spellSuppression',
];

export function aggregateCharacterStats(input: AggregatorInput): ResolvedCharacterStats {
  const allRaw: StatValue[] = [
    ...collectItemStats(input.items),
    ...collectSkillStats(input.skills),
    ...collectTreeStats(input.tree),
  ];

  const resolved = resolveModifiers(allRaw);
  const keystoneResult = applyKeystoneEffects(allRaw);

  const defense = buildDefense(resolved, keystoneResult);
  const offense = buildOffense(resolved);
  const mechanics = buildMechanics(resolved, keystoneResult);
  const attributes = buildAttributes(resolved);
  const traced = buildTracedStats(allRaw);

  return { defense, offense, mechanics, attributes, rawModifiers: allRaw, traced };
}

function buildDefense(
  r: ReturnType<typeof resolveModifiers>,
  ks: ReturnType<typeof applyKeystoneEffects>,
): ResolvedCharacterStats['defense'] {
  const def = emptyDefense();

  def.life = r.flat['life'] ?? 0;
  def.energyShield = r.flat['energyShield'] ?? 0;
  def.mana = r.flat['mana'] ?? 0;
  def.armour = r.flat['armour'] ?? 0;
  def.evasion = r.flat['evasion'] ?? 0;
  def.ward = r.flat['ward'] ?? 0;

  def.fireResistance = r.flat['fireResistance'] ?? 0;
  def.coldResistance = r.flat['coldResistance'] ?? 0;
  def.lightningResistance = r.flat['lightningResistance'] ?? 0;
  def.chaosResistance = r.flat['chaosResistance'] ?? 0;

  def.maxFireResistance = r.flat['maxFireResistance'] ?? 0;
  def.maxColdResistance = r.flat['maxColdResistance'] ?? 0;
  def.maxLightningResistance = r.flat['maxLightningResistance'] ?? 0;

  def.attackBlock = r.flat['attackBlock'] ?? 0;
  def.spellBlock = r.flat['spellBlock'] ?? 0;
  def.spellSuppression = r.flat['spellSuppression'] ?? 0;
  def.lifeRegen = r.flat['lifeRegen'] ?? 0;

  def.armourIncreased = r.increased['armour'] ?? 0;
  def.evasionIncreased = r.increased['evasion'] ?? 0;
  def.energyShieldIncreased = r.increased['energyShield'] ?? 0;
  def.lifeIncreased = r.increased['life'] ?? 0;

  for (const [key, value] of Object.entries(ks.overrides)) {
    if (key === 'life' && value !== undefined) def.life = value;
  }

  return def;
}

function buildTracedStats(allRaw: StatValue[]): TracedDefenseStats {
  const traced: Record<string, ReturnType<typeof makeTracedStat>> = {};
  for (const name of TRACED_STAT_NAMES) {
    traced[name] = makeTracedStat();
  }

  for (const sv of allRaw) {
    if (sv.type === 'flat' && TRACED_STAT_NAMES.includes(sv.name)) {
      addToTracedStat(traced[sv.name]!, {
        source: sv.modifierName || sv.source,
        value: sv.value,
        type: sv.type,
        scope: sv.scope,
      });
    }
  }

  return traced as unknown as TracedDefenseStats;
}

function buildOffense(r: ReturnType<typeof resolveModifiers>): ResolvedCharacterStats['offense'] {
  const off = emptyOffense();

  off.attackSpeed = r.increased['attackSpeed'] ?? 0;
  off.castSpeed = r.increased['castSpeed'] ?? 0;
  off.movementSpeed = r.increased['movementSpeed'] ?? 0;

  off.criticalChance = r.flat['criticalChance'] ?? 0;
  off.criticalMultiplier = r.flat['criticalMultiplier'] ?? 0;

  off.damageOverTimeMultiplier = r.increased['fireDamageOverTimeMultiplier'] ?? 0;

  for (const [name, value] of Object.entries(r.flat)) {
    if (name.includes('Damage')) {
      const amounts = off.flatDamage[name] ?? { min: 0, max: 0 };
      if (amounts.min === 0) {
        amounts.min = value;
      } else {
        amounts.max = value;
      }
      off.flatDamage[name] = amounts;
    }
  }

  for (const [name, value] of Object.entries(r.increased)) {
    if (name.includes('Damage') || name.includes('damage')) {
      off.increasedDamage[name] = value;
    }
  }

  for (const [name, value] of Object.entries(r.more)) {
    off.moreDamage[name] = value;
  }

  return off;
}

function buildMechanics(
  r: ReturnType<typeof resolveModifiers>,
  ks: ReturnType<typeof applyKeystoneEffects>,
): ResolvedCharacterStats['mechanics'] {
  const mech = emptyMechanics();

  for (const mod of r.rawModifiers) {
    if (mod.source === 'keystone') {
      mech.keystones.push(mod.name);
    }
  }

  for (const flag of ks.flags) {
    mech.ailments.push(flag);
  }

  for (const conv of r.conversions) {
    mech.conversion.push({ from: conv.from, to: conv.to, percent: conv.percent, kind: 'conversion' });
  }

  mech.overrides = { ...ks.overrides };

  return mech;
}

function buildAttributes(r: ReturnType<typeof resolveModifiers>): ResolvedCharacterStats['attributes'] {
  return {
    strength: r.flat['strength'] ?? 0,
    dexterity: r.flat['dexterity'] ?? 0,
    intelligence: r.flat['intelligence'] ?? 0,
  };
}
