import { BrowserWindow, net } from 'electron';

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

interface GggApiResponse<T> {
  success: boolean;
  data?: T;
  status?: number;
  error?: string;
}

function createGggWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  return win;
}

function makeGggError(status: number, bodyText: string): Error {
  if (status === 429) {
    if (bodyText.includes('Just a moment') || bodyText.includes('challenge') || bodyText.includes('cf-browser')) {
      return Object.assign(new Error('Cloudflare challenge — try again in a moment'), { code: 'rate_limited', retryAfter: 5 });
    }
    return Object.assign(new Error('GGG rate limit exceeded — retry after 60s'), { code: 'rate_limited', retryAfter: 60 });
  }
  if (status === 401 || status === 403) {
    return Object.assign(new Error('PoE session expired — reconnect your Path of Exile account'), { code: 'session_expired' });
  }
  if (status === 404) {
    return Object.assign(new Error('POESESSID invalid or copied incorrectly — check your browser cookies'), { code: 'session_invalid' });
  }
  return Object.assign(new Error(`GGG API returned ${status}`), { code: 'ggg_unavailable' });
}

async function fetchViaWindow<T>(path: string, poesessid: string): Promise<T> {
  const url = `${GGG_BASE}${path}`;
  const win = createGggWindow();

  try {
    await win.loadURL(`${GGG_BASE}/login`);
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const cookieScript = `
      document.cookie = 'POESESSID=${poesessid}; path=/; domain=.pathofexile.com; Secure; SameSite=Lax';
    `;
    await win.webContents.executeJavaScript(cookieScript);

    const fetchScript = `
      (async () => {
        try {
          const res = await fetch(${JSON.stringify(url)}, {
            headers: { 'Accept': 'application/json' },
          });
          const text = await res.text();
          let data;
          try { data = JSON.parse(text); } catch { data = null; }
          return { success: true, data, status: res.status };
        } catch (e) {
          return { success: false, error: String(e) };
        }
      })()
    `;

    const result: GggApiResponse<T> = await win.webContents.executeJavaScript(fetchScript);

    if (!result.success) {
      throw new Error(`GGG API call failed: ${result.error}`);
    }

    if (result.status && result.status !== 200) {
      const bodyText = JSON.stringify(result.data ?? '');
      throw makeGggError(result.status, bodyText);
    }

    return result.data as T;
  } finally {
    win.destroy();
  }
}

export function createElectronGggProvider() {
  return {
    async getAccountName(poesessid: string): Promise<string> {
      console.log('[ggg:electron] getAccountName', maskSessionId(poesessid));
      const data = await fetchViaWindow<{ name?: string }>('/api/profile', poesessid);
      if (!data?.name) throw Object.assign(new Error('Could not validate POESESSID — no account name returned'), { code: 'session_invalid' });
      return data.name;
    },

    async getCharacters(poesessid: string, accountName?: string): Promise<GggCharacter[]> {
      console.log('[ggg:electron] getCharacters', maskSessionId(poesessid));
      const query = accountName ? `?accountName=${encodeURIComponent(accountName)}` : '';
      const data = await fetchViaWindow<GggCharacter[]>(`/character-window/get-characters${query}`, poesessid);
      return data ?? [];
    },

    async getCharacterDetail(poesessid: string, characterName: string, accountName?: string): Promise<GggCharacterDetail> {
      console.log('[ggg:electron] getCharacterDetail', maskSessionId(poesessid), characterName);
      const query = [
        `character=${encodeURIComponent(characterName)}`,
        accountName ? `accountName=${encodeURIComponent(accountName)}` : '',
      ].filter(Boolean).join('&');
      return fetchViaWindow<GggCharacterDetail>(`/character-window/get-items?${query}`, poesessid);
    },
  };
}
