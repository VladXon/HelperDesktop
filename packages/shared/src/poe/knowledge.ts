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
