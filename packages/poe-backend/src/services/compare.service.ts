import type { BuildComparisonResult } from '../types.js';

interface BuildComparisonInput {
  hash: string;
  name: string | null;
  class: string | null;
  overallScore: number;
  offenseScore: number;
  defenseScore: number;
  life: number;
  es: number;
  totalDps: number;
}

export function compareBuilds(a: BuildComparisonInput, b: BuildComparisonInput): BuildComparisonResult {
  return {
    builds: [a, b].map((b) => ({
      hash: b.hash,
      name: b.name,
      class: b.class,
      overallScore: b.overallScore,
      offense: b.offenseScore,
      defense: b.defenseScore,
      life: b.life,
      es: b.es,
      totalDps: b.totalDps,
    })),
    deltas: {
      offenseDelta: b.offenseScore - a.offenseScore,
      defenseDelta: b.defenseScore - a.defenseScore,
      lifeDelta: b.life - a.life,
      esDelta: b.es - a.es,
      dpsDelta: b.totalDps - a.totalDps,
    },
  };
}
