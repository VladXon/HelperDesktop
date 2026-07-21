import type { SupportGem } from '../models/skill.model.js';
import type { ParsedSupportGemDto } from '../dto/skill.dto.js';
import { SUPPORT_GEM_DATA, type SupportGemData, type SupportGemLookup } from './support-gem.data.js';

export function resolveSupportGem(dto: ParsedSupportGemDto, lookup?: SupportGemLookup): SupportGem {
  const lib = lookup ?? SUPPORT_GEM_DATA;
  const data = findSupportData(dto.name, lib);

  return {
    name: dto.name,
    level: dto.level,
    quality: dto.quality,
    variant: dto.variant,
    isAwakened: dto.isAwakened,
    isCorrupted: dto.isCorrupted,
    moreMultiplier: data?.moreMultiplier ?? 0,
    increasedMultiplier: data?.increasedMultiplier ?? 0,
    supportedTags: data?.tags ?? [],
    restrictions: data?.restrictions ?? [],
  };
}

export function resolveSupportGems(dtos: ParsedSupportGemDto[], lookup?: SupportGemLookup): SupportGem[] {
  return dtos.map((dto) => resolveSupportGem(dto, lookup));
}

export function calculateSupportMultiplier(supports: SupportGem[]): { more: number; increased: number } {
  let moreProduct = 1.0;
  let increasedSum = 0;

  for (const sup of supports) {
    if (sup.moreMultiplier > 0) {
      moreProduct *= 1 + sup.moreMultiplier / 100;
    }
    if (sup.increasedMultiplier > 0) {
      increasedSum += sup.increasedMultiplier;
    }
  }

  return {
    more: Math.round((moreProduct - 1) * 1000) / 10,
    increased: Math.round(increasedSum * 10) / 10,
  };
}

function findSupportData(name: string, lib: SupportGemLookup): SupportGemData | undefined {
  const key = name.toLowerCase();
  return lib[key];
}
