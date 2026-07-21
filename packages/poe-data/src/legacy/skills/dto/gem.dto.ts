export type SkillTag =
  | 'physical' | 'fire' | 'cold' | 'lightning' | 'chaos' | 'elemental'
  | 'attack' | 'spell' | 'melee' | 'projectile' | 'aoe' | 'strike' | 'slam'
  | 'duration' | 'channelling' | 'totem' | 'trap' | 'mine' | 'trigger'
  | 'minion' | 'brand' | 'orb' | 'nova' | 'travel' | 'movement'
  | 'aura' | 'curse' | 'herald' | 'banner' | 'warcry' | 'guard'
  | 'dot' | 'bleed' | 'poison' | 'ignite'
  | 'vaal' | 'awakened' | 'transfigured';

export type DamageType = 'physical' | 'fire' | 'cold' | 'lightning' | 'chaos';

export interface DamageRange {
  type: DamageType;
  min: number;
  max: number;
}

export interface BaseDamageInfo {
  ranges: DamageRange[];
  effectiveness: number;
  attackTime: number | null;
  castTime: number | null;
}

export interface ParsedActiveGemDto {
  name: string;
  level: number;
  quality: number;
  variant: GemQualityVariant;
  isCorrupted: boolean;
  isVaal: boolean;
  isAwakened: boolean;
  tags: SkillTag[];
  gemId: string | null;
  baseDamageInfo: BaseDamageInfo | null;
}

export type GemQualityVariant = 'regular' | 'anomalous' | 'divergent' | 'phantasmal';
