import type { AnalysisResult } from '@helper/shared';

export interface SaveBuildInput {
  pobUrl: string;
  rawPobXml: string;
  buildName: string;
  characterClass: string;
  ascendancy: string | null;
  level: number;
  game: string;
  source: string;
}

export interface SaveAnalysisInput {
  buildHash: string;
  league: string;
  patchVersion: string;
  result: AnalysisResult;
  modifiers: ModifierRecord[];
  explanation: string | null;
}

export interface ModifierRecord {
  statId: string;
  source: string;
  type: 'explicit' | 'implicit' | 'crafted' | 'enchant' | 'passive' | 'gem' | 'custom';
  value: string;
}

export interface BuildListItem {
  id: number;
  buildHash: string;
  name: string | null;
  characterClass: string | null;
  ascendancy: string | null;
  level: number | null;
  pobUrl: string | null;
  game: string;
  overallScore: number | null;
  lastAnalyzedAt: string | null;
  createdAt: string;
}

export interface BuildDetail extends BuildListItem {
  source: string;
  rawPobXml: string | null;
  analyses: AnalysisHistoryItem[];
}

export interface AnalysisHistoryItem {
  id: number;
  league: string | null;
  patchVersion: string | null;
  analyzerVersion: string | null;
  overallScore: number;
  createdAt: string;
}

export interface BuildComparisonResult {
  builds: {
    hash: string;
    name: string | null;
    class: string | null;
    overallScore: number;
    offense: number;
    defense: number;
    life: number;
    es: number;
    totalDps: number;
  }[];
  deltas: {
    offenseDelta: number;
    defenseDelta: number;
    lifeDelta: number;
    esDelta: number;
    dpsDelta: number;
  };
}

export interface PoeAccountRecord {
  id: number;
  userId: number;
  poeAccountId: string;
  accountName: string;
  scopes: string;
  tokenExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectAccountInput {
  code: string;
  state: string;
}

export interface AuthUrlResponse {
  authUrl: string;
  state: string;
}

export interface PoeCharactersResponse {
  characters: Array<{
    name: string;
    league: string;
    class: string;
    level: number;
  }>;
}

export interface PoeStashResponse {
  numTabs: number;
  items: Array<Record<string, unknown>>;
}
