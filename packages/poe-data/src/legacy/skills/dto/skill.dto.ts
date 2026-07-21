import type { ParsedActiveGemDto, GemQualityVariant } from './gem.dto.js';

export interface ParsedSupportGemDto {
  name: string;
  level: number;
  quality: number;
  variant: GemQualityVariant;
  isAwakened: boolean;
  isCorrupted: boolean;
  multiplier: number | null;
  tags: string[];
  restrictions: string[];
}

export interface ParsedSkillSetupDto {
  activeGem: ParsedActiveGemDto | null;
  supportGems: ParsedSupportGemDto[];
  sockets: number;
  enabled: boolean;
}
