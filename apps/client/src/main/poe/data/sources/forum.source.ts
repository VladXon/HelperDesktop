import type { AdapterResult } from '@helper/shared';
import type { MetaBuild } from '@helper/shared';

const FORUM_BASE = 'https://www.pathofexile.com/forum';

export const forumSource = {
  name: 'GGGForum',
  baseUrl: FORUM_BASE,

  async fetchBuildList(
    league: string,
    classFilter: string,
  ): Promise<AdapterResult<MetaBuild[]>> {
    try {
      const url = `${FORUM_BASE}/view-forum/${getForumId(league, classFilter)}`;
      const res = await fetch(url);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();

      const builds = parseForumBuilds(html, league);
      return { ok: true, data: builds, meta: { source: 'forum', fetchedAt: Date.now(), cached: false } };
    } catch (err) {
      return { ok: false, error: `Forum fetch failed: ${err instanceof Error ? err.message : err}` };
    }
  },
};

function getForumId(league: string, _class: string): string {
  return league === 'Standard' ? '668' : '671';
}

function parseForumBuilds(html: string, league: string): MetaBuild[] {
  const builds: MetaBuild[] = [];
  const rowRegex = /<tr\s+class="thread"[^>]*>([\s\S]*?)<\/tr>/g;
  let match: RegExpExecArray | null;
  let count = 0;

  while ((match = rowRegex.exec(html)) !== null && count < 20) {
    const row = match[1] ?? '';
    const titleMatch = /<a[^>]*class="title"[^>]*>([^<]+)<\/a>/i.exec(row);
    const authorMatch = /<span[^>]*class="postBy"[^>]*>([^<]+)<\/span>/i.exec(row);
    const classMatch = /class="class[^"]*"[^>]*>([^<]+)</i.exec(row);

    if (titleMatch) {
      const rawTitle = titleMatch[1]?.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') ?? '';
      const simplified = simplifyTitle(rawTitle);
      builds.push({
        game: 'poe1',
        league,
        name: simplified,
        class: classMatch?.[1] ?? 'Unknown',
        ascendancy: classMatch?.[1] ?? '',
        mainSkill: '',
        popularity: count,
        budget: 'mid',
        pastebinUrl: null,
      });
      count++;
    }
  }

  return builds;
}

function simplifyTitle(title: string): string {
  return title
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[<>]/g, '')
    .trim() || title;
}
