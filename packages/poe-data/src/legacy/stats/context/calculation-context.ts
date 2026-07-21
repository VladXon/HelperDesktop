import type { EnemyContext } from './enemy-context.js';
import { defaultEnemy } from './enemy-context.js';
import type { ConditionContext } from './condition-context.js';
import { defaultConditions } from './condition-context.js';

export interface ChargeState {
  frenzy: number;
  power: number;
  endurance: number;
}

export interface BuffState {
  [buffName: string]: number;
}

export interface CalculationContext {
  characterLevel: number;
  enemy: EnemyContext;
  charges: ChargeState;
  buffs: BuffState;
  conditions: ConditionContext;
}

export function defaultCalculationContext(): CalculationContext {
  return {
    characterLevel: 90,
    enemy: defaultEnemy(),
    charges: { frenzy: 0, power: 0, endurance: 0 },
    buffs: {},
    conditions: defaultConditions(),
  };
}
