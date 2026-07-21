export interface ExchangeRatePoint {
  timestamp: number;
  rate: number;
}

export interface EconomySnapshot {
  league: string;
  currency: string;
  chaosEquivalent: number;
  divineEquivalent: number;
  change24h: number;
  listingCount: number;
  snapshotTime: number;
  history: ExchangeRatePoint[];
}

export interface EconomyDashboard {
  league: string;
  divinePrice: number;
  updatedAt: number;
  topMovers: { currency: string; change24h: number }[];
  snapshotCount: number;
}

export interface ItemValuation {
  league: string;
  itemName: string;
  itemType: string;
  chaosValue: number;
  confidence: 'high' | 'medium' | 'low';
  minPrice: number;
  medianPrice: number;
  maxPrice: number;
  listingCount: number;
  valuedAt: number;
}

export interface MetaBuild {
  game: string;
  league: string;
  name: string;
  class: string;
  ascendancy: string;
  mainSkill: string;
  popularity: number;
  budget: 'budget' | 'mid' | 'high' | 'mirror';
  pastebinUrl: string | null;
}

export interface LeagueInfo {
  game: string;
  leagueId: string;
  leagueName: string;
  isCurrent: boolean;
  isHardcore: boolean;
  isSsf: boolean;
  startDate: number;
  endDate: number | null;
}
