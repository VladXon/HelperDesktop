import type { DamageType, ConversionRule } from '../models/skill.model.js';

const CONVERSION_ORDER: DamageType[] = ['physical', 'lightning', 'cold', 'fire', 'chaos'];

export function resolveDamageAfterConversion(
  baseDamage: Partial<Record<DamageType, number>>,
  rules: ConversionRule[],
): Partial<Record<DamageType, number>> {
  const result: Partial<Record<DamageType, number>> = {};

  for (const type of CONVERSION_ORDER) {
    const base = baseDamage[type] ?? 0;
    if (base <= 0) continue;
    result[type] = (result[type] ?? 0) + base;
  }

  for (const rule of rules) {
    const sourceAmount = result[rule.from];
    if (!sourceAmount || sourceAmount <= 0) continue;

    if (rule.kind === 'addedAsExtra') {
      result[rule.to] = (result[rule.to] ?? 0) + (sourceAmount * rule.percent / 100);
    }
  }

  for (const rule of rules) {
    const sourceAmount = result[rule.from];
    if (!sourceAmount || sourceAmount <= 0) continue;

    if (rule.kind === 'conversion' || rule.kind === 'gainedAsExtra') {
      const converted = sourceAmount * rule.percent / 100;
      result[rule.from] = (result[rule.from] ?? 0) - converted;
      result[rule.to] = (result[rule.to] ?? 0) + converted;
    }
  }

  return result;
}

export function createConversionRule(
  from: DamageType,
  to: DamageType,
  percent: number,
  kind: 'conversion' | 'addedAsExtra' | 'gainedAsExtra',
): ConversionRule {
  return { from, to, percent, kind };
}

export function validateConversionOrder(from: DamageType, to: DamageType): boolean {
  const fromIdx = CONVERSION_ORDER.indexOf(from);
  const toIdx = CONVERSION_ORDER.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) return false;
  return toIdx > fromIdx;
}
