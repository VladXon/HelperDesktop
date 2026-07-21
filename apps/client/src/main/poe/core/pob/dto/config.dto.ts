export interface ChargedState {
  frenzy: number;
  power: number;
  endurance: number;
}

export interface ParsedConfigDto {
  isBoss: boolean;
  isGuardian: boolean;
  isUber: boolean;
  enemyResistances: number;
  charges: ChargedState;
}
