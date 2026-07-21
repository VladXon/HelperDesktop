import type { CalculationContext } from '../../stats/context/calculation-context.js';
import type { DamageResult } from './damage.types.js';

export function applyMitigation(
  result: DamageResult,
  context: CalculationContext,
): DamageResult {
  return { total: 0, breakdown: {} };
}
