import type { ItemRarity, SocketGroup, Influence } from '../../models/index.js';

export interface RawModDto {
  text: string;
  implicit: boolean;
  explicit: boolean;
  crafted: boolean;
}

export interface ParsedItemDto {
  id: string;
  baseType: string;
  rarity: ItemRarity;
  influence: Influence | null;
  isFractured: boolean;
  isSynthesised: boolean;
  isCorrupted: boolean;
  quality: number;
  sockets: SocketGroup[];
  implicitMods: RawModDto[];
  explicitMods: RawModDto[];
  craftedMods: RawModDto[];
  enchantMods: RawModDto[];
  fracturedMods: RawModDto[];
  corruptedMods: RawModDto[];
}
