import type { Modifier } from '../modifiers/modifier.js';
import type { CalculateBuildInput, CalculateBuildResult, BuildLayer } from './build-state.js';
import { ComputedStats } from './computed-stats.js';
import { STAT_REGISTRY } from '../registry/stat-registry.js';
import { createModifier } from '../modifiers/modifier-builder.js';
import { resolveModifiers } from '../modifiers/modifier-pipeline.js';
import { aggregateModifiers } from '../modifiers/modifier-aggregator.js';

export function calculateBuild(
  input: CalculateBuildInput,
): CalculateBuildResult {
  const baseModifiers = createBaseModifiers(input.baseStats);
  const allModifiers = [...baseModifiers, ...input.modSnapshot.modifiers];

  const resolved = resolveModifiers(allModifiers, input.conditionState);
  const aggregated = aggregateModifiers(resolved);

  const stats = new ComputedStats(aggregated);
  const layers = buildLayers(baseModifiers, input.modSnapshot.modifiers);

  return { stats, layers };
}

function createBaseModifiers(
  baseStats: Readonly<Record<string, number>>,
): Modifier[] {
  const mods: Modifier[] = [];

  for (const [statId, value] of Object.entries(baseStats)) {
    const statKey = STAT_REGISTRY[statId];
    if (!statKey || value === 0) continue;

    mods.push(
      createModifier({
        source: 'base',
        type: 'flat',
        stat: statKey,
        value,
        meta: { name: `Base ${statKey.displayName}` },
        id: `base.${statId}`,
      }),
    );
  }

  return mods;
}

function buildLayers(
  baseModifiers: Modifier[],
  snapshotModifiers: readonly Modifier[],
): BuildLayer[] {
  const layers: BuildLayer[] = [];

  if (baseModifiers.length > 0) {
    layers.push({ source: 'base', modifiers: baseModifiers });
  }

  const bySource = new Map<string, Modifier[]>();
  for (const mod of snapshotModifiers) {
    let group = bySource.get(mod.source);
    if (!group) {
      group = [];
      bySource.set(mod.source, group);
    }
    group.push(mod);
  }

  for (const [source, mods] of bySource) {
    layers.push({ source, modifiers: mods });
  }

  return layers;
}
