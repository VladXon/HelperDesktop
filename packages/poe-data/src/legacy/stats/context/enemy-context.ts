export interface EnemyContext {
  fireResistance: number;
  coldResistance: number;
  lightningResistance: number;
  chaosResistance: number;
  isBoss: boolean;
  isGuardian: boolean;
  isUber: boolean;
  level: number;
}

export function defaultEnemy(): EnemyContext {
  return {
    fireResistance: 0,
    coldResistance: 0,
    lightningResistance: 0,
    chaosResistance: 0,
    isBoss: false,
    isGuardian: false,
    isUber: false,
    level: 83,
  };
}

export function bossEnemy(isUber = false): EnemyContext {
  return {
    fireResistance: 30,
    coldResistance: 30,
    lightningResistance: 30,
    chaosResistance: 15,
    isBoss: true,
    isGuardian: !isUber,
    isUber,
    level: isUber ? 85 : 83,
  };
}
