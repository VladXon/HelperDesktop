import type { ModDB, AIProvider, ConditionState, CalculateBuildResult } from '@helper/poe-engine';
import {
  calculateBuild,
  resolveModifiers,
  aggregateModifiers,
  ComputedStats,
  defaultConditionState,
  explainBuild,
  createSnapshot,
} from '@helper/poe-engine';
import type { Build, AnalysisResult } from '@helper/shared';
import { analyze, type OffenseReport, type DefenseReport, type ScalingReport } from '@helper/poe-data';
import type { Modifier } from '@helper/poe-engine';

export interface PoeAnalysisInput {
  build: Build;
  modifiers: Modifier[];
  conditionState?: ConditionState;
}

export interface PoeAnalysisOutput {
  stats: Record<string, number>;
  layers: CalculateBuildResult['layers'];
  legacy: AnalysisResult;
  explanation: ReturnType<typeof explainBuild> | null;
}

export interface PoeAnalysisService {
  analyze(input: PoeAnalysisInput): Promise<PoeAnalysisOutput>;
  setAiProvider(provider: AIProvider | null): void;
}

export function createPoeAnalysisService(modDb: ModDB): PoeAnalysisService {
  let aiProvider: AIProvider | null = null;

  return {
    setAiProvider(provider: AIProvider | null): void {
      aiProvider = provider;
    },

    async analyze(input: PoeAnalysisInput): Promise<PoeAnalysisOutput> {
      const state = input.conditionState ?? defaultConditionState();

      modDb.clear();
      modDb.addMany(input.modifiers);
      const snapshot = modDb.snapshot();

      const engineResult = calculateBuild({
        baseStats: {},
        modSnapshot: snapshot,
        conditionState: state,
      });

      const stats: Record<string, number> = {};
      const all = engineResult.stats.all();
      for (const [key, value] of Object.entries(all)) {
        stats[key] = value;
      }

      const legacy = analyze(input.build);

      const explanationResult = explainBuild({
        stats: engineResult.stats,
        layers: engineResult.layers,
        modifiers: snapshot,
        conditionState: state,
      });

      return {
        stats,
        layers: engineResult.layers,
        legacy,
        explanation: explanationResult,
      };
    },
  };
}
