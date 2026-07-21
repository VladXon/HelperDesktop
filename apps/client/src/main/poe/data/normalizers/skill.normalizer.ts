import type { PoeSkillRecord, ExternalSkillDTO } from '@helper/shared';

export function normalizeSkill(raw: ExternalSkillDTO, now: number): PoeSkillRecord {
  const qualityStats = raw.qualityStats ??
    (raw.quality_stat_text ? raw.quality_stat_text.split('\n').filter(Boolean).map((s) => s.trim()) : []);

  return {
    game: 'poe1',
    name: (raw.name ?? '').trim(),
    type: (raw.skill_type ?? raw.type ?? 'active').trim(),
    gemLevel: raw.gemLevel ?? parseInt(raw.gem_level ?? '20', 10),
    manaMultiplier: raw.manaMultiplier ?? 100,
    qualityStats,
    tags: raw.tags ?? [],
    source: raw.source ?? 'unknown',
    sourceUrl: raw.sourceUrl ?? '',
    version: '',
    updatedAt: now,
  };
}

export function normalizeSkills(rawSkills: ExternalSkillDTO[], now: number): PoeSkillRecord[] {
  return rawSkills
    .filter((raw) => Boolean((raw.name ?? '').trim()))
    .map((raw) => normalizeSkill(raw, now))
    .filter((skill, index, self) =>
      index === self.findIndex((s) => s.name.toLowerCase() === skill.name.toLowerCase()),
    );
}
