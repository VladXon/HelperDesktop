import type { AdapterResult } from '@helper/shared';
import type { ExternalItemDTO, ExternalSkillDTO } from '@helper/shared';

const WIKI_API_BASE = 'https://www.poewiki.net/w/api.php';
const TIMEOUT = 15000;

interface WikiApiResponse {
  query?: { pages?: Record<string, WikiPage> };
}

interface WikiPage {
  pageid: number;
  title: string;
  extract?: string;
  fullurl?: string;
  categories?: Array<{ title: string }>;
}

interface WikiSearchResult {
  pageid: number;
  title: string;
  snippet?: string;
}

export const poeWikiSource = {
  name: 'PoeWiki',
  baseUrl: WIKI_API_BASE,

  async fetchItems(query: string): Promise<AdapterResult<WikiSearchResult[]>> {
    const params = new URLSearchParams({
      action: 'query', format: 'json', list: 'search',
      srsearch: query, srnamespace: '0', srlimit: '10', origin: '*',
    });
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT);
      const res = await fetch(`${WIKI_API_BASE}?${params}`, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as WikiApiResponse;
      const pages = json.query?.pages ?? {};
      const results: WikiSearchResult[] = Object.values(pages).map((p) => ({ pageid: p.pageid, title: p.title }));
      return { ok: true, data: results, meta: { source: 'poewiki', fetchedAt: Date.now(), cached: false } };
    } catch (err) {
      return { ok: false, error: `Wiki search failed: ${err instanceof Error ? err.message : err}` };
    }
  },

  async fetchUniques(): Promise<AdapterResult<ExternalItemDTO[]>> {
    const params = new URLSearchParams({
      action: 'cargoquery', format: 'json',
      tables: 'items',
      fields: 'name,base_item,required_level,item_class,flavour_text',
      where: 'rarity="Unique"',
      limit: '500',
      origin: '*',
    });
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT);
      const res = await fetch(`${WIKI_API_BASE}?${params}`, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { cargoquery?: Array<{ title: Record<string, string> }> };
      const items: ExternalItemDTO[] = (json.cargoquery ?? []).map((entry) => {
        const t = entry.title ?? {};
        return {
          name: t.name ?? '',
          base_item: t.base_item ?? '',
          item_class: t.item_class ?? '',
          required_level: t.required_level ?? '0',
          flavour_text: t.flavour_text ?? '',
          source: 'poewiki',
          sourceUrl: t.fullurl ?? '',
        };
      });
      return { ok: true, data: items, meta: { source: 'poewiki', fetchedAt: Date.now(), cached: false } };
    } catch (err) {
      return { ok: false, error: `Wiki uniques fetch failed: ${err instanceof Error ? err.message : err}` };
    }
  },

  async fetchSkills(): Promise<AdapterResult<ExternalSkillDTO[]>> {
    const params = new URLSearchParams({
      action: 'cargoquery', format: 'json',
      tables: 'skill',
      fields: 'name,skill_type,gem_level,quality_stat_text',
      limit: '500',
      origin: '*',
    });
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT);
      const res = await fetch(`${WIKI_API_BASE}?${params}`, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { cargoquery?: Array<{ title: Record<string, string> }> };
      const skills: ExternalSkillDTO[] = (json.cargoquery ?? []).map((entry) => {
        const t = entry.title ?? {};
        return {
          name: t.name ?? '',
          skill_type: t.skill_type ?? '',
          gem_level: t.gem_level ?? '20',
          quality_stat_text: t.quality_stat_text ?? '',
          source: 'poewiki',
          sourceUrl: t.fullurl ?? '',
        };
      });
      return { ok: true, data: skills, meta: { source: 'poewiki', fetchedAt: Date.now(), cached: false } };
    } catch (err) {
      return { ok: false, error: `Wiki skills fetch failed: ${err instanceof Error ? err.message : err}` };
    }
  },
};
