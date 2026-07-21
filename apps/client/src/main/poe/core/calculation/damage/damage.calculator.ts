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
  const addedResult = calculateAddedDamage(snapshot.stats, baseResult);
  const convertedResult = applyConversion(addedResult, skill);
  const scaledResult = applyScaling(convertedResult, snapshot.stats);
  const critResult = applyCritical(scaledResult, snapshot.stats);
  const penResult = applyPenetration(critResult, snapshot.stats);
  const finalResult = applyMitigation(penResult, snapshot.context);

  return {
    totalDps: finalResult.total,
    averageHit: 0,
    attackRate: 0,
    damageTypes: {},
    bossDps: 0,
    uberDps: 0,
    isDotBuild: skill.tags.includes('dot'),
  };
}

function emptyReport(): DamageReport {
  return {
    totalDps: 0,
    averageHit: 0,
    attackRate: 0,
    damageTypes: {},
    bossDps: 0,
    uberDps: 0,
    isDotBuild: false,
  };
}
