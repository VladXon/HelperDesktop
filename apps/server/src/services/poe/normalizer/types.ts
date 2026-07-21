export interface PoeCharacterSummary {
  id: number;
  name: string;
  level: number;
  class: string;
  ascendancy: string | null;
  league: string;
  lastSync: string;
}

export type ItemRarity = 'normal' | 'magic' | 'rare' | 'unique' | 'relic' | 'currency' | 'gem';

export interface PoeItemSocket {
  group: number;
  color: string;
}

export interface PoeGem {
  name: string;
  level: number;
  quality: number;
  support: boolean;
}

export interface PoeEquipmentItem {
  slot: string;
  name: string;
  baseType: string;
  rarity: ItemRarity;
  icon: string | null;
  sockets: PoeItemSocket[];
  socketedGems: PoeGem[];
  explicitMods: string[];
  implicitMods: string[];
  craftedMods: string[];
  enchantMods: string[];
  propertyValues: Record<string, number>;
}

export interface PoeSkillGroup {
  itemSlot: string;
  gems: PoeGem[];
}

export interface PoeCharacterDetails {
  id: number;
  name: string;
  level: number;
  class: string;
  ascendancy: string | null;
  league: string;

  equipment: PoeEquipmentItem[];
  skills: PoeSkillGroup[];
  rawData: Record<string, unknown>;
}
