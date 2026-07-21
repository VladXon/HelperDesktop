import type { AdapterResult } from '@helper/shared';

interface ForumThreadRaw {
  title: string;
  author: string;
  className: string;
}

const FORUM_BASE = 'https://www.pathofexile.com/forum';

export const forumSource = {
  name: 'GGGForum',
  baseUrl: FORUM_BASE,

  async fetchBuildList(league: string, _class: string): Promise<AdapterResult<ForumThreadRaw[]>> {
    try {
      const forumId = league === 'Standard' ? '668' : '671';
      const url = `${FORUM_BASE}/view-forum/${forumId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();

      const threads: ForumThreadRaw[] = [];
      const rowRegex = /<tr\s+class="thread"[^>]*>([\s\S]*?)<\/tr>/g;
      let match: RegExpExecArray | null;
      let count = 0;
      while ((match = rowRegex.exec(html)) !== null && count < 20) {
        const row = match[1] ?? '';
        const titleMatch = /<a[^>]*class="title"[^>]*>([^<]+)<\/a>/i.exec(row);
        const authorMatch = /<span[^>]*class="postBy"[^>]*>([^<]+)<\/span>/i.exec(row);
        const classMatch = /class="class[^"]*"[^>]*>([^<]+)</i.exec(row);
        if (titleMatch) {
          threads.push({
            title: titleMatch[1]?.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') ?? '',
            author: authorMatch?.[1] ?? 'Unknown',
            className: classMatch?.[1] ?? 'Unknown',
          });
          count++;
        }
      }
      return { ok: true, data: threads, meta: { source: 'forum', fetchedAt: Date.now(), cached: false } };
    } catch (err) {
      return { ok: false, error: `Forum fetch failed: ${err instanceof Error ? err.message : err}` };
    }
  },
};
