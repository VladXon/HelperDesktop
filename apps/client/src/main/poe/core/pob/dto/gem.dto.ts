export type GemQualityVariant = 'regular' | 'anomalous' | 'divergent' | 'phantasmal';

export interface ParsedActiveGemDto {
  name: string;
  level: number;
  quality: number;
  variant: GemQualityVariant;
  isVaal: boolean;
  isAwakened: boolean;
}

export interface ParsedSupportGemDto {
  name: string;
  level: number;
  quality: number;
  variant: GemQualityVariant;
  isAwakened: boolean;
}

export interface ParsedSkillSetupDto {
  id: number;
  slot: string;
  activeGem: ParsedActiveGemDto;
  supportGems: ParsedSupportGemDto[];
}
