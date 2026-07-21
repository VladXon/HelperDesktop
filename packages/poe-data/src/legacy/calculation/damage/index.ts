export { calculateDamage } from './damage.calculator.js';
export type { DamageReport, DamageBreakdown, DamageComponent, DamageType } from './damage.types.js';
export { computeByType, computeTotal, createBreakdown, emptyBreakdown, DAMAGE_TYPES } from './damage.types.js';

export { calculateBaseDamage } from './base-damage.js';
export { calculateAddedDamage } from './added-damage.js';
export { applyConversion } from './conversion.js';
export { applyScaling } from './scaling.js';
export { applyCritical } from './critical.js';
export { applyPenetration } from './penetration.js';
export { applyMitigation } from './mitigation.js';
