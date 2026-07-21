export { fromPob } from './factory/build-factory.js';
export { resolveBuildStats, resolveItemStats, aggregateMods } from './resolvers/stat-resolver.js';
export { estimateOffense } from './calculators/damage.calculator.js';
export { calculateDefense } from './calculators/defense.calculator.js';
export { evaluateDamageReport, evaluateDefenseReport, evaluateScaling, detectUpgrades } from './rules/index.js';
export { analyze } from './engine/analyzer.engine.js';
export { explainProblem, explainRecommendation, buildRecommendationList } from './explanation/index.js';
export type { ProblemExplanation } from './explanation/index.js';
export { parsePobXml, parsePobPastebin, isPobPastebinUrl, extractPastebinId } from './parsers/pob-xml.parser.js';
export { importFromPobUrl, importFromPobXml } from './adapters/pob.adapter.js';

export type { PoBXmlDTO, PoBBuildAttributes, PoBSkill, PoBSkillSet, PoBMod, PoBSocket, PoBItem, PoBTree, PoBConfig } from './dto/pob-xml.dto.js';
export type { PoBImportOptions } from './adapters/pob.adapter.js';

export type {
  Build,
  EquipmentSlot,
  EquippedItem,
  Modifier,
  ComputedItemStats,
  CharacterBase,
  PassiveTreeSnapshot,
  SkillSetup,
  SkillGem,
  BuildConfig,
  AnalysisResult,
  AnalysisContext,
  OffenseReport,
  DefenseReport,
  Problem,
  Warning,
  UpgradeRecommendation,
  ScalingReport,
  BuildScores,
  BuildSummary,
  AnalysisMetadata,
  SocketGroup,
  DamageRange,
  ItemRarity,
  SkillSummary,
  LeechSummary,
  GuardSkillSummary,
  DamageProfile,
  ScalingVector,
  ChargeState,
  ClusterJewelSummary,
  Influence,
} from './models/index.js';
