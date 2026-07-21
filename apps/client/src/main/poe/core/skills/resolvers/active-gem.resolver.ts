import type { ActiveSkill, SkillTag, DamageRange, ConversionRule, SkillMechanic } from '../models/skill.model.js';
import type { ParsedActiveGemDto } from '../dto/gem.dto.js';
import { GEM_LIBRARY, type GemData, type GemLookup } from './gem.library.js';

export function resolveActiveGem(dto: ParsedActiveGemDto, lookup?: GemLookup): ActiveSkill {
  const lib = lookup ?? GEM_LIBRARY;
  const gemData = findGemData(dto.name, lib);

  return {
    name: dto.name,
    level: dto.level,
    quality: dto.quality,
    variant: dto.variant,
    isVaal: dto.isVaal,
    isAwakened: dto.isAwakened,
    isCorrupted: dto.isCorrupted,
    tags: mergeTags(gemData?.tags ?? dto.tags, dto),
    baseDamage: gemData?.baseDamageRanges ?? [],
    effectiveness: gemData?.effectiveness ?? 1.0,
    attackTime: gemData?.attackTime ?? null,
    castTime: gemData?.castTime ?? null,
    conversion: gemData?.conversion ?? [],
    mechanics: gemData?.mechanics ?? buildDefaultMechanics(dto.tags),
  };
}

function findGemData(name: string, lib: GemLookup): GemData | undefined {
  const key = name.toLowerCase();
  return lib[key];
}

function mergeTags(baseTags: SkillTag[], dto: ParsedActiveGemDto): SkillTag[] {
  const tags = new Set(baseTags);
  if (dto.isVaal) tags.add('vaal');
  if (dto.isAwakened) tags.add('awakened');
  return [...tags];
}

function buildDefaultMechanics(tags: SkillTag[]): SkillMechanic[] {
  const mechanics: SkillMechanic[] = [];
  if (tags.includes('trap')) mechanics.push({ type: 'trap', multiplier: 1.0 });
  if (tags.includes('mine')) mechanics.push({ type: 'mine', multiplier: 1.0 });
  if (tags.includes('totem')) mechanics.push({ type: 'totem', multiplier: 1.0 });
  if (tags.includes('minion')) mechanics.push({ type: 'minion', multiplier: 1.0 });
  if (tags.includes('brand')) mechanics.push({ type: 'brand', multiplier: 1.0 });
  if (tags.includes('channelling')) mechanics.push({ type: 'channelling', multiplier: 1.0 });
  if (tags.includes('trigger')) mechanics.push({ type: 'trigger', multiplier: 1.0 });
  if (mechanics.length === 0) mechanics.push({ type: 'selfCast', multiplier: 1.0 });
  return mechanics;
}
