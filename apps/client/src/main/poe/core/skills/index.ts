export type {
  SkillTag,
  DamageType,
  DamageRange,
  ConversionRule,
  ActiveSkill,
  SkillSetup,
  SupportGem,
  SkillMechanic,
  GemQualityVariant,
} from './models/index.js';

export type {
  BaseDamageInfo,
  ParsedActiveGemDto,
  ParsedSupportGemDto,
  ParsedSkillSetupDto,
} from './dto/index.js';

export { resolveActiveGem } from './resolvers/active-gem.resolver.js';
export { resolveSupportGem, resolveSupportGems, calculateSupportMultiplier } from './resolvers/support-gem.resolver.js';
export { resolveQualityEffects } from './resolvers/quality.resolver.js';

export { createSkillSetup, createSkillSetups } from './factory/skill.factory.js';

export {
  resolveDamageAfterConversion,
  createConversionRule,
  validateConversionOrder,
  isAttack,
  isSpell,
  isMelee,
  isProjectile,
  isAoE,
  isDuration,
  isDoT,
  isMinion,
  isTrap,
  isMine,
  isTotem,
  getDamageTypes,
} from './mechanics/index.js';
