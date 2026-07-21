import type { PoBSkillSet, PoBSkill } from '../dto/pob-xml.dto.js';
import type { ParsedSkillSetupDto, ParsedActiveGemDto, ParsedSupportGemDto, GemQualityVariant } from './dto/gem.dto.js';

export function parsePoBSkills(skillSets: PoBSkillSet[]): ParsedSkillSetupDto[] {
  return skillSets.map(parseSkillSet);
}

function parseSkillSet(set: PoBSkillSet): ParsedSkillSetupDto {
  const active = set.skills.find((s: PoBSkill) => s.active);
  const supports = set.skills.filter((s: PoBSkill) => !s.active);

  return {
    id: set.id,
    slot: '',
    activeGem: active ? parseActiveGem(active) : emptyActiveGem(),
    supportGems: supports.map(parseSupportGem),
  };
}

function parseActiveGem(skill: PoBSkill): ParsedActiveGemDto {
  const { cleanName, isVaal, isAwakened } = normalizeGemName(skill.name);
  return {
    name: cleanName,
    level: skill.level,
    quality: skill.quality,
    variant: mapVariant(skill.variant),
    isVaal,
    isAwakened,
  };
}

function parseSupportGem(skill: PoBSkill): ParsedSupportGemDto {
  const { cleanName, isAwakened } = normalizeGemName(skill.name);
  return {
    name: cleanName,
    level: skill.level,
    quality: skill.quality,
    variant: mapVariant(skill.variant),
    isAwakened,
  };
}

function normalizeGemName(name: string): { cleanName: string; isVaal: boolean; isAwakened: boolean } {
  const isVaal = /^vaal\s/i.test(name);
  const isAwakened = /^awakened\s/i.test(name);
  let cleanName = name;
  if (isVaal) cleanName = cleanName.replace(/^vaal\s/i, '');
  if (isAwakened) cleanName = cleanName.replace(/^awakened\s/i, '');
  return { cleanName, isVaal, isAwakened };
}

function mapVariant(raw: string): GemQualityVariant {
  const lower = raw.toLowerCase();
  if (lower === 'anomalous') return 'anomalous';
  if (lower === 'divergent') return 'divergent';
  if (lower === 'phantasmal') return 'phantasmal';
  return 'regular';
}

function emptyActiveGem(): ParsedActiveGemDto {
  return {
    name: '',
    level: 1,
    quality: 0,
    variant: 'regular',
    isVaal: false,
    isAwakened: false,
  };
}
