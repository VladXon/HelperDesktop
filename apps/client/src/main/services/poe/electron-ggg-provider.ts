import { net } from 'electron';

const GGG_BASE = 'https://www.pathofexile.com';

export interface GggCharacter {
  name: string;
  league: string;
  class: string;
  level: number;
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
    frameType: number;
    icon?: string;
    socketedItems?: Array<{
      id: string;
      typeLine: string;
      support?: boolean;
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
    sockets?: Array<{ group: number; attr: string; sColour: string }>;
    socket?: number;
  }>;
  jewels?: Array<unknown>;
}

function maskSessionId(poesessid: string): string {
  if (poesessid.length <= 8) return '***';
  return poesessid.slice(0, 4) + '***' + poesessid.slice(-4);
}

async function gggFetch<T>(path: string, poesessid: string): Promise<T> {
  const url = `${GGG_BASE}${path}`;

  const res = await net.fetch(url, {
    headers: {
      'User-Agent': 'HelperDesktop/1.0',
      'Cookie': `POESESSID=${poesessid}`,
    },
  });

  if (res.status === 429) {
    const retryAfter = res.headers.get('Retry-After');
    throw Object.assign(new Error(`GGG rate limit exceeded${retryAfter ? ` — retry after ${retryAfter}s` : ''}`), {
      code: 'rate_limited',
      retryAfter: retryAfter ? parseInt(retryAfter, 10) : 60,
    });
  }

  if (res.status === 401 || res.status === 403) {
    throw Object.assign(new Error('PoE session expired — reconnect your Path of Exile account'), { code: 'session_expired' });
  }

  if (res.status === 404) {
    throw Object.assign(new Error('POESESSID invalid or copied incorrectly — check your browser cookies'), { code: 'session_invalid' });
  }

  if (!res.ok) {
    throw Object.assign(new Error(`GGG API returned ${res.status}`), { code: 'ggg_unavailable' });
  }

  return res.json() as Promise<T>;
}

export function createElectronGggProvider() {
  return {
    async getAccountName(poesessid: string): Promise<string> {
      console.log('[ggg:electron] getAccountName', maskSessionId(poesessid));
      const data = await gggFetch<{ name?: string }>('/character-window/get-account-name', poesessid);
      if (!data?.name) throw Object.assign(new Error('Could not validate POESESSID — no account name returned'), { code: 'session_invalid' });
      return data.name;
    },

    async getCharacters(poesessid: string): Promise<GggCharacter[]> {
      console.log('[ggg:electron] getCharacters', maskSessionId(poesessid));
      const data = await gggFetch<GggCharacter[]>('/character-window/get-characters', poesessid);
      return data ?? [];
    },

    async getCharacterDetail(poesessid: string, characterName: string): Promise<GggCharacterDetail> {
      console.log('[ggg:electron] getCharacterDetail', maskSessionId(poesessid), characterName);
      return gggFetch<GggCharacterDetail>(`/character-window/get-items?character=${encodeURIComponent(characterName)}`, poesessid);
    },
  };
}
