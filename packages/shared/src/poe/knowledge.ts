export interface PoeItemRecord {
  game: string;
  name: string;
  baseType: string;
  itemType: string;
  category: string;
  level: number;
  requiredLevel: number;
  explicitStats: Record<string, unknown>;
  dropSources: string[];
  flavourText: string;
  icon: string;
  source: string;
  sourceUrl: string;
  version: string;
  updatedAt: number;
}

export interface PoeSkillRecord {
  game: string;
  name: string;
  type: string;
  gemLevel: number;
  manaMultiplier: number;
  qualityStats: string[];
  tags: string[];
  source: string;
  sourceUrl: string;
  version: string;
  updatedAt: number;
}

export interface PoeLeagueRecord {
  game: string;
  leagueId: string;
  leagueName: string;
  isCurrent: boolean;
  isHardcore: boolean;
  isSsf: boolean;
  startDate: number;
  endDate: number | null;
  version: string;
}

export interface PoeModifierRecord {
  name: string;
  domain: string;
  generationType: string;
  values: number[];
  tags: string[];
  tiers: number[];
}

// ---- External DTOs (raw data from external APIs) ----
// These are the contracts that sources return BEFORE normalization.
// Normalizers consume these and produce Poe*Record types.

export interface ExternalItemDTO {
  name?: string;
  base_item?: string;
  baseType?: string;
  item_class?: string;
  itemType?: string;
  category?: string;
  required_level?: string;
  requiredLevel?: number;
  flavour_text?: string;
  flavourText?: string;
  explicitStats?: Record<string, unknown>;
  dropSources?: string[];
  icon?: string;
  source?: string;
  sourceUrl?: string;
}

export interface ExternalSkillDTO {
  name?: string;
  skill_type?: string;
  type?: string;
  gem_level?: string;
  gemLevel?: number;
  manaMultiplier?: number;
  qualityStats?: string[];
  quality_stat_text?: string;
  tags?: string[];
  source?: string;
  sourceUrl?: string;
}

export interface ExternalModifierDTO {
  name?: string;
  domain?: string;
  generationType?: string;
  values?: number[];
  tags?: string[];
  tiers?: number[];
}

export interface ExternalLeagueDTO {
  game?: string;
  leagueId?: string;
  leagueName?: string;
  isCurrent?: boolean;
  isHardcore?: boolean;
  isSsf?: boolean;
  startDate?: number;
  endDate?: number | null;
}

export interface ExternalEconomyEntry {
  currencyTypeName?: string;
  chaosEquivalent?: number;
  divineEquivalent?: number;
  listingCount?: number;
  name?: string;
  chaosValue?: number;
  divineValue?: number;
}
