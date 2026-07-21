export type { CharacterSnapshot, ResolvedSkillSnapshot } from './snapshot.model.js';
export { createCharacterSnapshot } from './snapshot.model.js';

export { calculateDamage } from './damage/damage.calculator.js';
export type { DamageReport, DamageBreakdown, DamageComponent, DamageType } from './damage/damage.types.js';

export { calculateDefense } from './defense/defense.calculator.js';
export type { DefenseReport } from './defense/defense.calculator.js';

export { calculateBaseDamage, calculateAddedDamage, applyConversion, applyScaling, applyCritical, applyPenetration, applyMitigation } from './damage/index.js';
export { calculateArmourMitigation, calculateEvasionChance, calculateEffectiveResistances, calculateBlockChance, calculateRecovery, calculateSpellSuppression } from './defense/index.js';
