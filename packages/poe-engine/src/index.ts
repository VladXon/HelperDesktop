export {
  STAT_REGISTRY,
  S,
  type StatKey,
  type StatCategory,
  type AggregationKind,
  type GameStatMapping,
  type StatTransform,
} from './registry/index.js';

export {
  and,
  or,
  not,
  state,
  charge,
  skillTag,
  actor,
  threshold,
  slot,
  socketedIn,
  recently,
  timer,
  duringAction,
  stacks,
  always,
  never,
  constantScale,
  chargeScale,
  statScale,
  stackScale,
} from './conditions/builder.js';

export {
  evaluateCondition,
  evaluateScale,
  evaluateDistanceScale,
  evaluateEventScale,
  evaluateEffectiveness,
} from './conditions/evaluator.js';

export {
  stringifyCondition,
  stringifyScale,
} from './conditions/stringifier.js';

export { defaultConditionState } from './conditions/condition-expr.js';

export type {
  ConditionExpr,
  AndConditions,
  OrConditions,
  NotCondition,
  AlwaysCondition,
  NeverCondition,
  ConditionState,
} from './conditions/condition-expr.js';

export type {
  ConditionLeaf,
  StateCondition,
  ChargeCondition,
  SkillTagCondition,
  ActorCondition,
  StatThresholdCondition,
  SlotCondition,
  SocketedInCondition,
  GlobalEffectCondition,
  RecentlyCondition,
  TimerCondition,
  DuringActionCondition,
  StackCondition,
} from './conditions/condition-leaf.js';

export type {
  ScaleExpr,
  ConstantScale,
  ChargeScale,
  StatScale,
  StackScale,
  DistanceScale,
  EventScale,
} from './conditions/scale-expr.js';

export type {
  ModifierEffectiveness,
  ResolvedEffectiveness,
} from './conditions/effectiveness.js';

export type {
  ModifierSource,
  ModifierType,
  ModifierMeta,
} from './modifiers/modifier-types.js';

export type { Modifier } from './modifiers/modifier.js';

export type { CreateModifierInput } from './modifiers/modifier-builder.js';

export type { ResolvedModifier } from './modifiers/modifier-pipeline.js';

export { createModifier } from './modifiers/modifier-builder.js';

export { resolveModifiers } from './modifiers/modifier-pipeline.js';

export { aggregateModifiers } from './modifiers/modifier-aggregator.js';

export { ModDB, createModDB } from './moddb/moddb.js';

export type { ModifierFilter, ModDBStats } from './moddb/modifier-query.js';

export type { ModifierSnapshot } from './moddb/modifier-snapshot.js';

export { createSnapshot } from './moddb/modifier-snapshot.js';

export { ComputedStats } from './calculator/computed-stats.js';

export { calculateBuild } from './calculator/calculator.js';

export type { CalculateBuildInput, CalculateBuildResult, BuildLayer } from './calculator/build-state.js';

export {
  explainBuild,
  explainStat,
  explainAllStats,
  explainModifier,
  explainAllModifiers,
} from './explanation/index.js';

export type {
  ExplanationContext,
  ExplanationResult,
  StatExplanation,
  StatBreakdown,
  ValueSource,
  ModifierExplanation,
  ConditionExplanation,
} from './explanation/index.js';

export type {
  AIProvider,
  AIRequest,
  AIResponse,
  AIMessage,
  AIUsage,
} from './explanation/index.js';

export {
  buildAnalysisSystemPrompt,
  buildAnalysisUserPrompt,
  upgradeAdviceSystemPrompt,
  upgradeAdviceUserPrompt,
  defenseAnalysisSystemPrompt,
  defenseAnalysisUserPrompt,
  damageAnalysisSystemPrompt,
  damageAnalysisUserPrompt,
  comparisonSystemPrompt,
  comparisonUserPrompt,
} from './explanation/index.js';
