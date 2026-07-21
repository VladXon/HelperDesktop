import type { AdapterResult, ExternalItemDTO, ExternalSkillDTO } from '@helper/shared';
import type { HttpClient } from '../../http/http-client.js';

const WIKI_API_BASE = 'https://www.poewiki.net/w/api.php';

interface WikiSearchResult {
  pageid: number;
  title: string;
}

export interface WikiSource {
  readonly name: string;
  readonly baseUrl: string;
  fetchItems(query: string): Promise<AdapterResult<WikiSearchResult[]>>;
  fetchUniques(): Promise<AdapterResult<ExternalItemDTO[]>>;
  fetchSkills(): Promise<AdapterResult<ExternalSkillDTO[]>>;
}

export function createWikiSource(httpClient: HttpClient): WikiSource {
  return {
    name: 'PoeWiki',
    baseUrl: WIKI_API_BASE,

    async fetchItems(query: string): Promise<AdapterResult<WikiSearchResult[]>> {
      const params = new URLSearchParams({
        action: 'query', format: 'json', list: 'search',
        srsearch: query, srnamespace: '0', srlimit: '10', origin: '*',
      });
      try {
        const json = await httpClient.get<{
          query?: { pages?: Record<string, { pageid: number; title: string }> };
        }>(`${WIKI_API_BASE}?${params}`);
        const pages = json.query?.pages ?? {};
        const results: WikiSearchResult[] = Object.values(pages).map((p) => ({ pageid: p.pageid, title: p.title }));
        return { ok: true, data: results, meta: { source: 'poewiki', fetchedAt: Date.now(), cached: false } };
      } catch (err) {
        return { ok: false, error: `Wiki search failed: ${err instanceof Error ? err.message : String(err)}` };
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
        const json = await httpClient.get<{
          cargoquery?: Array<{ title: Record<string, string> }>;
        }>(`${WIKI_API_BASE}?${params}`);
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
        return { ok: false, error: `Wiki uniques fetch failed: ${err instanceof Error ? err.message : String(err)}` };
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
        const json = await httpClient.get<{
          cargoquery?: Array<{ title: Record<string, string> }>;
        }>(`${WIKI_API_BASE}?${params}`);
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
        return { ok: false, error: `Wiki skills fetch failed: ${err instanceof Error ? err.message : String(err)}` };
      }
    },
  };
}
