import type { ComputedItemStats, BuildConfig, OffenseReport, SkillSummary, DamageRange } from '../models/index.js';

const BASE_MONSTER_RESISTANCE = 30;
const BOSS_RESISTANCE_MAP = { normal: 30, rare: 40, boss: 50, uber: 70 } as const;

export function calculateOffense(
  stats: ComputedItemStats,
  config: BuildConfig,
  skillName: string,
  baseDamageRanges: DamageRange[],
  effectiveness: number,
  attackTime: number,
): OffenseReport {
  const isBoss = config.isBoss;
  const enemyResist: number = isBoss ? BOSS_RESISTANCE_MAP.uber : (config.enemyResistances || BASE_MONSTER_RESISTANCE);

  const penetration = Math.min(stats.resistances.fire * -0.01, 0);
  const effectiveResist = Math.max(0, enemyResist + penetration * 100);

  let totalHit = 0;
  const damageBreakdown = { physical: 0, fire: 0, cold: 0, lightning: 0, chaos: 0 };

  for (const range of damageRanges().length > 0 ? damageRanges() : computeBaseDamage(stats)) {
    const avgHit = (range.min + range.max) / 2;
    const typeMultiplier = getDamageMultiplier(stats, range.type);
    const rawHit = avgHit * (effectiveness || 1) * (typeMultiplier || 1);

    let finalHit = rawHit;
    if (range.type !== 'chaos') {
      const resistMult = ((100 - effectiveResist) / 100);
      const penMult = range.type === 'fire'
        ? Math.max(0, resistMult + (Math.abs(stats.resistances.fire) / 100))
        : resistMult;
      finalHit = rawHit * Math.max(penMult, 0.1);
    }

    damageBreakdown[range.type] += finalHit;
    totalHit += finalHit;
  }

  const hitRate = attackTime > 0 ? 1 / attackTime : 1;
  const totalDps = totalHit * hitRate;
  const bossPenalty = isBoss ? 0.6 : 1;
  const uberPenalty = isBoss ? 0.35 : 0.7;

  const attackSpeed = 1 + (stats.attackSpeed / 100);
  const critChance = clamp((stats.criticalChance ?? 0) / 100, 0, 0.95);
  const critMultiplier = (stats.criticalMultiplier ?? 0) / 100;

  const mainSkill: SkillSummary = {
    name: skillName || 'Unknown',
    hitRate,
    averageHit: totalHit,
    penetration: Math.abs(penetration),
  };

  return {
    mainSkill,
    totalDps: Math.round(totalDps * 100) / 100,
    bossDps: Math.round(totalDps * bossPenalty * 100) / 100,
    uberDps: Math.round(totalDps * uberPenalty * 100) / 100,
    damageBreakdown: {
      physical: Math.round(damageBreakdown.physical * 100) / 100,
      fire: Math.round(damageBreakdown.fire * 100) / 100,
      cold: Math.round(damageBreakdown.cold * 100) / 100,
      lightning: Math.round(damageBreakdown.lightning * 100) / 100,
      chaos: Math.round(damageBreakdown.chaos * 100) / 100,
    },
    penetration: Math.abs(penetration),
    resistanceReduction: 0,
    critChance,
    critMultiplier,
    attackSpeed,
    isDotBuild: false,
    dotDps: 0,
    witherStacks: 0,
    shockEffect: 0,
  };
}

function computeBaseDamage(stats: ComputedItemStats): DamageRange[] {
  if (stats.flatDamage.length > 0) return stats.flatDamage;
  return [{ type: 'physical', min: 10, max: 20 }];
}

function damageRanges(): DamageRange[] {
  return [];
}

function getDamageMultiplier(stats: ComputedItemStats, type: DamageRange['type']): number {
  const increased = stats.increasedDamage;
  const map: Record<DamageRange['type'], string> = {
    physical: 'physical',
    fire: 'fire',
    cold: 'cold',
    lightning: 'lightning',
    chaos: 'chaos',
  };
  const key: string = map[type];
  const baseMultiplier = 1 + ((increased[key] ?? 0) / 100);
  const genericMultiplier = 1 + ((increased['elemental_attack'] ?? 0) / 100);
  return type === 'physical' ? baseMultiplier : baseMultiplier * genericMultiplier;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
