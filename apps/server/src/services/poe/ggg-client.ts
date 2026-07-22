import { log } from '../../utils/logger.js';
import { HttpError } from '../../middleware/error-handler.js';
import type { GggCharacter, GggCharacterDetail, PoeDataProvider } from './ggg-data-provider.js';

export type { GggCharacter, GggCharacterDetail, PoeDataProvider };

const API_BASE = 'https://api.pathofexile.com';

function maskSessionId(poesessid: string): string {
  if (poesessid.length <= 8) return '***';
  return poesessid.slice(0, 4) + '***' + poesessid.slice(-4);
}

async function gggFetch<T>(path: string, poesessid: string): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        'User-Agent': 'HelperDesktop/1.0',
        'Cookie': `POESESSID=${poesessid}`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.info('ggg_unavailable', { path, error: msg });
    throw new HttpError(502, 'ggg_unavailable', 'Path of Exile service is unavailable — try again later');
  }

  if (res.status === 429) {
    const retryAfter = res.headers.get('Retry-After');
    log.info('ggg_rate_limited', { path, retryAfter: retryAfter ?? 'none' });
    throw new HttpError(429, 'rate_limited', `GGG rate limit exceeded${retryAfter ? ` — retry after ${retryAfter}s` : ''}`);
  }

  if (res.status === 401 || res.status === 403) {
    log.info('ggg_session_expired', { path });
    throw new HttpError(401, 'session_expired', 'PoE session expired — reconnect your Path of Exile account');
  }

  if (res.status === 404) {
    log.info('ggg_session_invalid', { path });
    throw new HttpError(400, 'session_invalid', 'POESESSID invalid or copied incorrectly — check your browser cookies');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    log.info('ggg_api_error', { path, status: res.status, body: text.slice(0, 200) });
    throw new HttpError(502, 'ggg_unavailable', `Path of Exile servers unavailable (${res.status})`);
  }

  return res.json() as Promise<T>;
}

export function createGggClient(): PoeDataProvider {
  return {
    async getAccountName(poesessid: string): Promise<string> {
      log.info('ggg_get_account_name', { session: maskSessionId(poesessid) });
      const data = await gggFetch<{ name?: string }>('/profile', poesessid);
      if (!data?.name) throw new HttpError(400, 'session_invalid', 'Could not validate POESESSID — no account name returned');
      return data.name;
    },

    async getCharacters(poesessid: string): Promise<Array<{ name: string; league: string; class: string; level: number }>> {
      log.info('ggg_get_characters', { session: maskSessionId(poesessid) });
      const data = await gggFetch<Array<{ name: string; league: string; class: string; level: number }>>('/character-window/get-characters', poesessid);
      return data ?? [];
    },

    async getCharacterDetail(poesessid: string, characterName: string): Promise<GggCharacterDetail> {
      log.info('ggg_get_character_detail', { session: maskSessionId(poesessid), character: characterName });
      return gggFetch<GggCharacterDetail>(`/character-window/get-items?character=${encodeURIComponent(characterName)}`, poesessid);
    },
  };
}
