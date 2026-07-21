import type { ComputedItemStats, BuildConfig, DefenseReport, LeechSummary, GuardSkillSummary } from '../models/index.js';

// ---- Approximation constants ----
// All values below are best-effort estimates. Exact game values vary by class,
// attacker accuracy, hit size, and patch version. Not game-accurate calculations.

/** Base life per level — class-independent average. Actual per-level life ranges 9.5-12.5 by class. */
const BASE_LIFE_PER_LEVEL = 12;
/** Base mana per level — class-independent average. */
const BASE_MANA_PER_LEVEL = 6;
/** Life gained per point of strength. Accurate for PoE1. */
const LIFE_PER_STR = 0.5;
/** Mana gained per point of intelligence. Accurate for PoE1. */
const MANA_PER_INT = 0.5;
/** Evasion gained per point of dexterity. Accurate for PoE1. */
const EVASION_PER_DEX = 0.2;

const MAX_RESIST_CAP = 75;
const CHAOS_RESIST_CAP = 75;

export function calculateDefense(
  stats: ComputedItemStats,
  config: BuildConfig,
  characterLevel: number,
  characterClass: string,
): DefenseReport {
  const baseLife = 38 + (characterLevel * BASE_LIFE_PER_LEVEL);
  const baseMana = 34 + (characterLevel * BASE_MANA_PER_LEVEL);
  const attrLife = stats.attributes.str * LIFE_PER_STR;
  const attrMana = stats.attributes.int * MANA_PER_INT;

  const totalFlatLife = baseLife + stats.life + attrLife;
  // Approximation: hardcoded +5% fallback when exact increased life value is unparsed
  const increasedLife = (stats.increasedDamage['life'] ?? 0) + (stats.explicits.filter((m) => m.name.includes('increased maximum life')).length > 0 ? 5 : 0);
  const finalLife = Math.round(totalFlatLife * (1 + increasedLife / 100));

  const totalFlatES = stats.energyShield;
  const increasedES = (stats.increasedDamage['es'] ?? 0);
  const finalES = Math.round(totalFlatES * (1 + (increasedES || 0) / 100));

  const combinedPool = finalLife + finalES;

  const baseMaxRes = {
    fire: MAX_RESIST_CAP + stats.maxResistances.fire,
    cold: MAX_RESIST_CAP + stats.maxResistances.cold,
    lightning: MAX_RESIST_CAP + stats.maxResistances.lightning,
  };

  const resistances = {
    fire: {
      uncapped: stats.resistances.fire,
      capped: Math.min(stats.resistances.fire, baseMaxRes.fire),
      overcap: Math.max(0, stats.resistances.fire - baseMaxRes.fire),
    },
    cold: {
      uncapped: stats.resistances.cold,
      capped: Math.min(stats.resistances.cold, baseMaxRes.cold),
      overcap: Math.max(0, stats.resistances.cold - baseMaxRes.cold),
    },
    lightning: {
      uncapped: stats.resistances.lightning,
      capped: Math.min(stats.resistances.lightning, baseMaxRes.lightning),
      overcap: Math.max(0, stats.resistances.lightning - baseMaxRes.lightning),
    },
    chaos: {
      uncapped: stats.resistances.chaos,
      capped: Math.min(stats.resistances.chaos, CHAOS_RESIST_CAP),
      overcap: Math.max(0, stats.resistances.chaos - CHAOS_RESIST_CAP),
    },
  };

  const armour = stats.armour;
  const evasion = stats.evasion + (stats.attributes.dex * EVASION_PER_DEX);

  // Phys reduction approximation: armour / (armour + damage*5), assuming ~1000 dmg hit
  const physReduction = armour > 0
    ? Math.min(Math.round((armour / (armour + 5000)) * 100), 90)
    : 0;

  // Evasion approximation: evasion / (evasion + attackerAccuracy), assuming ~10000 accuracy
  const evadeChance = evasion > 0
    ? Math.min(Math.round((evasion / (evasion + 10000)) * 100), 95)
    : 0;

  const lifeRegenPercent = stats.lifeRegen / finalLife * 100;

  // STUB: Leech calculation not yet implemented
  const leechSummary: LeechSummary = {
    totalLeech: 0,
    leechRate: 0,
    duration: 0,
  };

  // STUB: Guard skill detection not yet implemented
  const guardSkill: GuardSkillSummary | null = null;

  const physEhp = armour > 0
    ? Math.round(combinedPool / (1 - physReduction / 100))
    : combinedPool;

  const avgEleResist = (resistances.fire.capped + resistances.cold.capped + resistances.lightning.capped) / 3;
  const eleEhp = avgEleResist > 0
    ? Math.round(combinedPool / (1 - avgEleResist / 100))
    : combinedPool * 3;

  const chaosEhp = resistances.chaos.capped > 0
    ? Math.round(combinedPool / (1 - resistances.chaos.capped / 100))
    : combinedPool;

  const maxResistances = { ...baseMaxRes };
  const recovery = {
    lifeRegen: Math.round(stats.lifeRegen * 10) / 10,
    lifeRegenPercent: Math.round(lifeRegenPercent * 10) / 10,
    leech: leechSummary,
    lifeOnHit: 0,
    lifeOnBlock: stats.onBlockGain,
    energyShieldRecharge: finalES > 0 ? Math.round(finalES * 0.2) : 0,
    esRechargeDelay: 2,
    recoupPercent: 0, // STUB: recoup calculation not yet implemented
  };

  return {
    life: Math.round(finalLife),
    energyShield: Math.round(finalES),
    combinedPool: Math.round(combinedPool),
    resistances,
    maxResistances,
    armour: Math.round(armour),
    physicalReduction: physReduction,
    evasion: Math.round(evasion),
    evadeChance,
    block: stats.blockChance,
    spellSuppression: stats.spellSuppression,
    recovery,
    ehp: {
      physicalMaxHit: physEhp,
      elementalMaxHit: eleEhp,
      chaosMaxHit: chaosEhp,
    },
    ailmentImmunity: {}, // STUB: ailment detection not yet implemented
    guardSkill,
  };
}
