export interface ConditionContext {
  hasFrenzyCharges: boolean;
  hasPowerCharges: boolean;
  hasEnduranceCharges: boolean;
  isLowLife: boolean;
  isFullLife: boolean;
  isLeeching: boolean;
  isFortified: boolean;
  hasOnslaught: boolean;
  isPhasing: boolean;
  hasConsecratedGround: boolean;
  isStationary: boolean;
  isMoving: boolean;
}

export function defaultConditions(): ConditionContext {
  return {
    hasFrenzyCharges: false,
    hasPowerCharges: false,
    hasEnduranceCharges: false,
    isLowLife: false,
    isFullLife: true,
    isLeeching: false,
    isFortified: false,
    hasOnslaught: false,
    isPhasing: false,
    hasConsecratedGround: false,
    isStationary: false,
    isMoving: false,
  };
}
