import type { StatKey } from '../registry/stat-key.js';
import type { Modifier } from '../modifiers/modifier.js';

export interface ExplanationResult {
  readonly summary: string;
  readonly stats: readonly StatExplanation[];
  readonly modifiers: readonly ModifierExplanation[];
  readonly conditions: readonly ConditionExplanation[];
}

export interface StatExplanation {
  readonly stat: StatKey;
  readonly value: number;
  readonly explanation: string;
  readonly breakdown: StatBreakdown;
}

export interface StatBreakdown {
  readonly base: number;
  readonly flatContributions: readonly ValueSource[];
  readonly increasedContributions: readonly ValueSource[];
  readonly moreContributions: readonly ValueSource[];
  readonly lessContributions: readonly ValueSource[];
  readonly overrideContributions: readonly ValueSource[];
  readonly formula: string;
}

export interface ValueSource {
  readonly source: string;
  readonly value: number;
  readonly label: string;
}

export interface ModifierExplanation {
  readonly modifier: Modifier;
  readonly active: boolean;
  readonly effectiveValue: number;
  readonly reason: string;
}

export interface ConditionExplanation {
  readonly condition: string;
  readonly active: boolean;
  readonly explanation: string;
}
