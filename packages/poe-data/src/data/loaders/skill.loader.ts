import type { PoeSkillRecord } from '@helper/shared';
import type { AdapterResult } from '@helper/shared';
import type { WikiSource } from '../sources/poe-wiki.source.js';
import { normalizeSkills } from '../normalizers/skill.normalizer.js';

export interface SkillLoaderResult {
  skills: PoeSkillRecord[];
  source: string;
  fetchedAt: number;
}

export function createSkillLoader(wikiSource: WikiSource) {
  return {
    async loadSkills(): Promise<AdapterResult<SkillLoaderResult>> {
      const result = await wikiSource.fetchSkills();
      if (!result.ok) return result;

      const now = Date.now();
      const normalized = normalizeSkills(result.data, now);
      return {
        ok: true,
        data: { skills: normalized, source: 'poewiki', fetchedAt: now },
        meta: result.meta,
      };
    },
  };
}
