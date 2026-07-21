export { fromPob, resolveBuildStats, resolveItemStats, aggregateMods } from './core/index.js';
export { estimateOffense, calculateDefense } from './core/index.js';
export { evaluateDamageReport, evaluateDefenseReport, evaluateScaling, detectUpgrades } from './core/index.js';
export { analyze } from './core/index.js';
export { explainProblem, explainRecommendation, buildRecommendationList } from './core/index.js';
export { parsePobXml, parsePobPastebin, isPobPastebinUrl, extractPastebinId } from './core/index.js';

export { importFromPobUrl, importFromPobXml } from './core/adapters/pob.adapter.js';

export type { PoBImportOptions } from './core/adapters/pob.adapter.js';

export type {
  ProblemExplanation,
  PoBXmlDTO, PoBBuildAttributes, PoBSkill, PoBSkillSet, PoBMod, PoBSocket, PoBItem, PoBTree, PoBConfig,
  Build, EquipmentSlot, EquippedItem, Modifier, ComputedItemStats,
  CharacterBase, PassiveTreeSnapshot, SkillSetup, SkillGem, BuildConfig,
  AnalysisResult, AnalysisContext, OffenseReport, DefenseReport,
  Problem, Warning, UpgradeRecommendation, ScalingReport,
  BuildScores, BuildSummary, AnalysisMetadata,
  SocketGroup, DamageRange, ItemRarity,
  SkillSummary, LeechSummary, GuardSkillSummary,
  DamageProfile, ScalingVector, ChargeState, ClusterJewelSummary, Influence,
} from './core/index.js';

export {
  poeWikiSource, ninjaSource, tradeSource, forumSource,
  loadUniques, searchItems, loadSkills, loadPassiveTree, loadLeagues,
  normalizeItem, normalizeItems, normalizeSkill, normalizeSkills, normalizeMod, normalizeMods,
  normalizeEconomyEntry, normalizeEconomyEntries, normalizeLeague, normalizeLeagues,
  runSyncPipeline, SyncScheduler,
  createSyncResult,
} from './data/index.js';

export type {
  TradeSearchResult,
  ItemLoaderResult, SkillLoaderResult, LeagueLoaderResult,
  SyncEngineOptions, SyncResult,
  DataSource, DataSourceOptions,
} from './data/index.js';
