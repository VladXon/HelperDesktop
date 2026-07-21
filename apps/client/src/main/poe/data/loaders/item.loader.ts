import type { PoeItemRecord } from '@helper/shared';
import type { AdapterResult } from '@helper/shared';
import { poeWikiSource } from '../sources/poe-wiki.source.js';
import { normalizeItems } from '../normalizers/item.normalizer.js';

export interface ItemLoaderResult {
  items: PoeItemRecord[];
  source: string;
  fetchedAt: number;
}

export async function loadUniques(): Promise<AdapterResult<ItemLoaderResult>> {
  const result = await poeWikiSource.fetchUniques();
  if (!result.ok) return result;

  const now = Date.now();
  const normalized = normalizeItems(result.data, now);
  return {
    ok: true,
    data: { items: normalized, source: 'poewiki', fetchedAt: now },
    meta: result.meta,
  };
}

export async function searchItems(query: string): Promise<AdapterResult<ItemLoaderResult>> {
  const result = await poeWikiSource.fetchItems(query);
  if (!result.ok) return result;

  const now = Date.now();
  const normalized = normalizeItems(
    result.data.map((s) => ({ name: s.title })),
    now,
  );
  return {
    ok: true,
    data: { items: normalized, source: 'poewiki', fetchedAt: now },
    meta: result.meta,
  };
}
