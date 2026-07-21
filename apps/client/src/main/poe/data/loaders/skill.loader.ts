import type { PoeSkillRecord } from '@helper/shared';
import type { AdapterResult } from '@helper/shared';
import { poeWikiSource } from '../sources/poe-wiki.source.js';
import { normalizeSkills } from '../normalizers/skill.normalizer.js';

export interface SkillLoaderResult {
  skills: PoeSkillRecord[];
  source: string;
  fetchedAt: number;
}

export async function loadSkills(): Promise<AdapterResult<SkillLoaderResult>> {
  const result = await poeWikiSource.fetchSkills();
  if (!result.ok) return result;

  const normalized = normalizeSkills(result.data);
  return {
    ok: true,
    data: { skills: normalized, source: 'poewiki', fetchedAt: Date.now() },
    meta: result.meta,
  };
}
