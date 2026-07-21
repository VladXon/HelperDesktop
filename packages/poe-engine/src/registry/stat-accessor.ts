import type { StatKey } from './stat-key.js';
import { STAT_REGISTRY } from './stat-registry.js';

interface StatAccessor {
  [key: string]: StatKey;
}

export const S: StatAccessor = new Proxy(STAT_REGISTRY, {
  get(target, path: string) {
    const key = target[path];
    if (!key) {
      const candidates = Object.keys(target);
      const closest = findClosest(path, candidates);
      throw new Error(
        `Unknown stat key: "${path}". ` +
          `Valid keys are in the StatRegistry. ` +
          `Did you mean "${closest}"?`,
      );
    }
    return key;
  },
}) as unknown as StatAccessor;

function findClosest(input: string, candidates: readonly string[]): string {
  let best = candidates[0] ?? 'unknown';
  let bestScore = Infinity;
  for (const c of candidates) {
    const score = levenshtein(input, c);
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0]![j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i]![j] =
        b.charAt(i - 1) === a.charAt(j - 1)
          ? matrix[i - 1]![j - 1]!
          : Math.min(
              matrix[i - 1]![j - 1]! + 1,
              matrix[i - 1]![j]! + 1,
              matrix[i]![j - 1]! + 1,
            );
    }
  }
  return matrix[b.length]![a.length]!;
}
