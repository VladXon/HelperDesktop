import { log } from '../../utils/logger.js';
import { HttpError } from '../../middleware/error-handler.js';

const API_BASE = 'https://www.pathofexile.com';

export interface GggClient {
  getAccountName(poesessid: string): Promise<string>;
  getCharacters(poesessid: string): Promise<Array<{ name: string; league: string; class: string; level: number }>>;
  getCharacterDetail(poesessid: string, characterName: string): Promise<GggCharacterDetail>;
}

export interface GggCharacterDetail {
  character: {
    name: string;
    league: string;
    classId: number;
    ascendancyClass: number;
    class: string;
    level: number;
    experience: number;
  };
  items: Array<{
    id: string;
    name: string;
    typeLine: string;
    inventoryId: string;
    socketedItems?: Array<{
      id: string;
      typeLine: string;
      properties?: Array<{ name: string; values: Array<[string, number]>; displayMode: number; type: number }>;
      requirements?: Array<{ name: string; values: Array<[string, number]>; displayMode: number }>;
      explicitMods?: string[];
      frameType: number;
      socket?: number;
    }>;
    properties?: Array<{ name: string; values: Array<[string, number]>; displayMode: number; type: number }>;
    requirements?: Array<{ name: string; values: Array<[string, number]>; displayMode: number }>;
    explicitMods?: string[];
    implicitMods?: string[];
    craftedMods?: string[];
    enchantMods?: string[];
    frameType: number;
    sockets?: Array<{ group: number; attr: string; sColour: string }>;
    socket?: number;
  }>;
  jewels?: Array<unknown>;
}

async function gggFetch<T>(path: string, poesessid: string): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'HelperDesktop/1.0',
      'Cookie': `POESESSID=${poesessid}`,
    },
  });

  if (res.status === 401 || res.status === 403) {
    throw new HttpError(401, 'session_expired', 'PoE session expired — reconnect your Path of Exile account');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    log.info('ggg_api_error', { path, status: res.status, text: text.slice(0, 200) });
    throw new HttpError(502, 'ggg_api_error', `GGG API ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export function createGggClient(): GggClient {
  return {
    async getAccountName(poesessid: string): Promise<string> {
      const data = await gggFetch<{ name?: string }>('/character-window/get-account-name', poesessid);
      if (!data?.name) throw new HttpError(400, 'invalid_poesessid', 'Could not validate POESESSID — no account name returned');
      return data.name;
    },

    async getCharacters(poesessid: string): Promise<Array<{ name: string; league: string; class: string; level: number }>> {
      const data = await gggFetch<Array<{ name: string; league: string; class: string; level: number }>>('/character-window/get-characters', poesessid);
      return data ?? [];
    },

    async getCharacterDetail(poesessid: string, characterName: string): Promise<GggCharacterDetail> {
      return gggFetch<GggCharacterDetail>(`/character-window/get-stash-items?character=${encodeURIComponent(characterName)}`, poesessid);
    },
  };
}
