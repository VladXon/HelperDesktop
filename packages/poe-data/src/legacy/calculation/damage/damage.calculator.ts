import type { CharacterSnapshot } from '../snapshot.model.js';
import { calculateBaseDamage } from './base-damage.js';
import { calculateAddedDamage } from './added-damage.js';
import { applyConversion } from './conversion.js';
import { applyScaling } from './scaling.js';
import { applyCritical } from './critical.js';
import { applyPenetration } from './penetration.js';
import { applyMitigation } from './mitigation.js';
import type { DamageReport } from './damage.types.js';

export function calculateDamage(snapshot: CharacterSnapshot, skillIndex = 0): DamageReport {
  const skill = snapshot.resolvedSkills[skillIndex];
  if (!skill) return emptyReport();

  const baseResult = calculateBaseDamage(skill);

  const addedResult = calculateAddedDamage(
    snapshot.stats,
    baseResult,
    skill.effectiveness,
  );

  const convertedResult = applyConversion(
    addedResult,
    skill,
    snapshot.stats.mechanics.conversion,
  );

  const scaledResult = applyScaling(convertedResult, snapshot.stats);
  const critResult = applyCritical(scaledResult, snapshot.stats);
  const penResult = applyPenetration(critResult, snapshot.stats);

  const isDot = skill.tags.includes('dot');

  const castRate = skill.castTime
    ? 1 / skill.castTime
    : skill.attackTime
      ? 1 / skill.attackTime
      : 1;

  const totalDps = isDot
    ? calculateDotDps(skill, snapshot)
    : penResult.total * castRate;

  const averageHit = isDot ? 0 : penResult.total;

  const bossCtx = {
    ...snapshot.context,
    enemy: {
      ...snapshot.context.enemy,
      isBoss: true,
      isGuardian: true,
      isUber: false,
      fireResistance: 30,
      coldResistance: 30,
      lightningResistance: 30,
      chaosResistance: 15,
    },
  };

  const bossResult = applyMitigation(penResult, bossCtx);
  const bossDps = isDot ? totalDps * 0.7 : bossResult.total * castRate;

  const uberCtx = {
    ...bossCtx,
    enemy: { ...bossCtx.enemy, isUber: true, isGuardian: false,
      fireResistance: 50, coldResistance: 50, lightningResistance: 50, chaosResistance: 30 },
  };

  const uberResult = applyMitigation(penResult, uberCtx);
  const uberDps = isDot ? totalDps * 0.5 : uberResult.total * castRate;

  return {
    totalDps: Math.round(totalDps * 10) / 10,
    averageHit: Math.round(averageHit * 10) / 10,
    castRate: Math.round(castRate * 100) / 100,
    damageTypes: penResult.byType,
    bossDps: Math.round(bossDps * 10) / 10,
    uberDps: Math.round(uberDps * 10) / 10,
    isDotBuild: isDot,
    breakdown: penResult,
  };
}

function calculateDotDps(skill: CharacterSnapshot['resolvedSkills'][number], snapshot: CharacterSnapshot): number {
  let total = 0;
  for (const bd of skill.baseDamage) {
    const avg = (bd.min + bd.max) / 2;
    let dotDmg = avg * skill.effectiveness * (1 + snapshot.stats.offense.damageOverTimeMultiplier / 100);
    total += dotDmg;
  }
  return total;
}

function emptyReport(): DamageReport {
  return {
    totalDps: 0,
    averageHit: 0,
    castRate: 0,
    damageTypes: {},
    bossDps: 0,
    uberDps: 0,
    isDotBuild: false,
    breakdown: { total: 0, components: [], byType: {}, contributions: {} },
  };
}
