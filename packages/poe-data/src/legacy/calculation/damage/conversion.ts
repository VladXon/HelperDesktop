import type { ResolvedSkillSnapshot } from '../snapshot.model.js';
import type { DamageComponent, DamageBreakdown, DamageType } from './damage.types.js';
import { computeTotal, computeByType, createBreakdown } from './damage.types.js';

const CONVERSION_ORDER: DamageType[] = ['physical', 'lightning', 'cold', 'fire', 'chaos'];

interface ConversionRule {
  from: DamageType;
  to: DamageType;
  percent: number;
  kind: 'conversion' | 'addedAsExtra' | 'gainedAsExtra';
}

export function applyConversion(
  breakdown: DamageBreakdown,
  skill: ResolvedSkillSnapshot,
  externalConversions?: { from: string; to: string; percent: number; kind: string }[],
): DamageBreakdown {
  const rules: ConversionRule[] = [];

  for (const conv of skill.conversion) {
    rules.push({
      from: conv.from as DamageType,
      to: conv.to as DamageType,
      percent: conv.percent,
      kind: 'conversion' as const,
    });
  }

  if (externalConversions) {
    for (const ec of externalConversions) {
      rules.push({
        from: ec.from as DamageType,
        to: ec.to as DamageType,
        percent: ec.percent,
        kind: (ec.kind === 'addedAsExtra' || ec.kind === 'gainedAsExtra')
          ? ec.kind : 'conversion',
      });
    }
  }

  const components: DamageComponent[] = [];
  for (const comp of breakdown.components) {
    const converted = applyConversionToComponent(comp, rules);
    components.push(...converted);
  }

  return createBreakdown(components, { ...breakdown.contributions, converted: computeTotal(components) });
}

function applyConversionToComponent(
  comp: DamageComponent,
  rules: ConversionRule[],
): DamageComponent[] {
  const result: { type: DamageType; value: number; originType: DamageType }[] = [];
  let remaining = comp.value;

  const extraRules = rules.filter((r) => r.kind === 'addedAsExtra' || r.kind === 'gainedAsExtra');
  for (const rule of extraRules) {
    if (rule.from !== comp.type) continue;
    const gained = comp.value * (rule.percent / 100);
    if (gained > 0) {
      result.push({ type: rule.to, value: gained, originType: rule.from });
    }
  }

  const convRules = rules.filter((r) => r.kind === 'conversion')
    .sort((a, b) => CONVERSION_ORDER.indexOf(a.to) - CONVERSION_ORDER.indexOf(b.to));

  let totalConvertedPct = 0;
  for (const rule of convRules) {
    if (rule.from !== comp.type) continue;
    if (totalConvertedPct >= 100) continue;
    const pct = Math.min(rule.percent, 100 - totalConvertedPct);
    const converted = comp.value * (pct / 100);
    if (converted > 0) {
      totalConvertedPct += pct;
      remaining -= converted;
      result.push({ type: rule.to, value: converted, originType: comp.type });
    }
  }

  if (remaining > 0) {
    result.push({ type: comp.type, value: remaining, originType: comp.type });
  }

  return result.map((r) => ({
    type: r.type,
    value: r.value,
    baseValue: comp.value > 0 ? comp.baseValue * r.value / comp.value : 0,
    originType: r.originType,
    tags: [...comp.tags],
    source: r.type !== comp.type ? `${comp.source}:converted` : comp.source,
  }));
}
