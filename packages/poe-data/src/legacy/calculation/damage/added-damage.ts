import type { ResolvedCharacterStats } from '../../stats/models/character-stats.model.js';
import type { DamageComponent, DamageBreakdown } from './damage.types.js';
import { computeTotal, computeByType, createBreakdown, DAMAGE_TYPES } from './damage.types.js';

export function calculateAddedDamage(
  stats: ResolvedCharacterStats,
  baseBreakdown: DamageBreakdown,
  effectiveness: number,
): DamageBreakdown {
  const components = [...baseBreakdown.components];

  for (const [key, range] of Object.entries(stats.offense.flatDamage)) {
    const dmgType = mapFlatKeyToType(key);
    if (!dmgType) continue;

    const avgAdded = ((range.min + range.max) / 2) * effectiveness;
    if (avgAdded <= 0) continue;

    const addedComponent: DamageComponent = {
      type: dmgType,
      value: avgAdded,
      baseValue: avgAdded / effectiveness,
      originType: dmgType,
      tags: [],
      source: `flat:${key}`,
    };
    components.push(addedComponent);
  }

  return createBreakdown(components, { ...baseBreakdown.contributions, added: computeTotal(components) });
}

function mapFlatKeyToType(key: string): DamageComponent['type'] | null {
  const lower = key.toLowerCase();
  for (const dt of DAMAGE_TYPES) {
    if (lower.startsWith(dt)) return dt;
  }
  if (lower === 'elementaldamage') return null;
  return null;
}
