import type { PoeSkillRecord } from '@helper/shared';

interface ExternalSkillDTO {
  name?: string;
  type?: string;
  gemLevel?: number;
  manaMultiplier?: number;
  qualityStats?: string[];
  quality_stat_text?: string;
  tags?: string[];
  source?: string;
  sourceUrl?: string;
}

export function normalizeSkill(raw: ExternalSkillDTO): PoeSkillRecord {
  const qualityStats = raw.qualityStats ??
    (raw.quality_stat_text ? raw.quality_stat_text.split('\n').filter(Boolean) : []);

  return {
    game: 'poe1',
    name: (raw.name ?? '').trim(),
    type: (raw.type ?? 'active').trim(),
    gemLevel: raw.gemLevel ?? 20,
    manaMultiplier: raw.manaMultiplier ?? 100,
    qualityStats: qualityStats.map((s) => s.trim()).filter(Boolean),
    tags: raw.tags ?? [],
    source: raw.source ?? 'unknown',
    sourceUrl: raw.sourceUrl ?? '',
    version: '',
    updatedAt: Date.now(),
  };
}

export function normalizeSkills(rawSkills: ExternalSkillDTO[]): PoeSkillRecord[] {
  return rawSkills
    .filter((raw) => Boolean((raw.name ?? '').trim()))
    .map(normalizeSkill)
    .filter((skill, index, self) =>
      index === self.findIndex((s) => s.name.toLowerCase() === skill.name.toLowerCase()),
    );
}
