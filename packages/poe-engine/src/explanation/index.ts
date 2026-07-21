export { explainBuild } from './build-explainer.js';

export { explainStat, explainAllStats } from './stat-explainer.js';

export { explainModifier, explainAllModifiers } from './modifier-explainer.js';

export type { ExplanationContext } from './explanation-context.js';

export type {
  ExplanationResult,
  StatExplanation,
  StatBreakdown,
  ValueSource,
  ModifierExplanation,
  ConditionExplanation,
} from './explanation-types.js';

export {
  buildAnalysisSystemPrompt,
  buildAnalysisUserPrompt,
} from './prompts/build-analysis.js';

export {
  upgradeAdviceSystemPrompt,
  upgradeAdviceUserPrompt,
} from './prompts/upgrade-advice.js';

export {
  defenseAnalysisSystemPrompt,
  defenseAnalysisUserPrompt,
} from './prompts/defense-analysis.js';

export {
  damageAnalysisSystemPrompt,
  damageAnalysisUserPrompt,
} from './prompts/damage-analysis.js';

export {
  comparisonSystemPrompt,
  comparisonUserPrompt,
} from './prompts/comparison.js';

export type {
  AIProvider,
  AIRequest,
  AIResponse,
  AIMessage,
  AIUsage,
} from './ai-provider/index.js';
