export type SkillTag =
  | 'physical' | 'fire' | 'cold' | 'lightning' | 'chaos' | 'elemental'
  | 'attack' | 'spell' | 'melee' | 'projectile' | 'aoe' | 'strike' | 'slam'
  | 'duration' | 'channelling' | 'totem' | 'trap' | 'mine' | 'trigger'
  | 'minion' | 'brand' | 'orb' | 'nova' | 'travel' | 'movement'
  | 'aura' | 'curse' | 'herald' | 'banner' | 'warcry' | 'guard'
  | 'dot' | 'bleed' | 'poison' | 'ignite'
  | 'vaal' | 'awakened' | 'transfigured';

export type DamageType = 'physical' | 'fire' | 'cold' | 'lightning' | 'chaos';

export type GemQualityVariant = 'regular' | 'anomalous' | 'divergent' | 'phantasmal';

export interface DamageRange {
  type: DamageType;
  min: number;
  max: number;
}

export interface ConversionRule {
  from: DamageType;
  to: DamageType;
  percent: number;
  kind: 'conversion' | 'addedAsExtra' | 'gainedAsExtra';
}

export interface ActiveSkill {
  name: string;
  level: number;
  quality: number;
  variant: GemQualityVariant;
  isVaal: boolean;
  isAwakened: boolean;
  isCorrupted: boolean;
  tags: SkillTag[];
  baseDamage: DamageRange[];
  effectiveness: number;
  attackTime: number | null;
  castTime: number | null;
  conversion: ConversionRule[];
  mechanics: SkillMechanic[];
}

export interface SkillMechanic {
  type: 'selfCast' | 'trap' | 'mine' | 'totem' | 'trigger' | 'minion' | 'brand' | 'channelling';
  multiplier: number;
}

export interface SkillSetup {
  activeSkill: ActiveSkill | null;
  supports: SupportGem[];
  enabled: boolean;
  sockets: number;
}

export interface SupportGem {
  name: string;
  level: number;
  quality: number;
  variant: GemQualityVariant;
  isAwakened: boolean;
  isCorrupted: boolean;
  moreMultiplier: number;
  increasedMultiplier: number;
  supportedTags: string[];
  restrictions: string[];
}
