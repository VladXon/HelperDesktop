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
  isJson?: boolean;
  isHtml?: boolean;
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

function makeGggError(status: number, bodyText: string, isHtml?: boolean): Error {
  if (status === 429) {
    if (isHtml || bodyText.includes('Just a moment') || bodyText.includes('challenge') || bodyText.includes('cf-browser')) {
      return Object.assign(new Error('Cloudflare challenge — retrying...'), { code: 'rate_limited', retryAfter: 5 });
    }
    return Object.assign(new Error('GGG rate limit — wait 60s before retrying'), { code: 'rate_limited', retryAfter: 60 });
  }
  if (isHtml && (status === 503 || status === 403)) {
    return Object.assign(new Error('Cloudflare block — unable to reach GGG API'), { code: 'ggg_unavailable' });
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
    await win.webContents.session.clearStorageData({ storages: ['cookies'] });

    await win.webContents.session.cookies.set({
      url: GGG_BASE,
      name: 'POESESSID',
      value: poesessid,
      domain: '.pathofexile.com',
      path: '/',
      secure: true,
      sameSite: 'lax',
    });

    await win.loadURL(`${GGG_BASE}/login`);

    await new Promise<void>((resolve, reject) => {
      let finished = false;
      const timeout = setTimeout(() => {
        if (!finished) { finished = true; resolve(); }
      }, 25000);

      win.webContents.on('did-finish-load', () => {
        if (!finished) { finished = true; clearTimeout(timeout); resolve(); }
      });

      win.webContents.on('did-fail-load', (_e, code, desc, _validatedUrl, isMainFrame) => {
        if (!isMainFrame || code === -3) return;
        if (!finished) { finished = true; clearTimeout(timeout); reject(new Error(`Page load failed: ${code} ${desc}`)); }
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const fetchScript = `
      (async () => {
        try {
          const res = await fetch(${JSON.stringify(url)}, {
            headers: { 'Accept': 'application/json' },
            credentials: 'include',
          });
          const contentType = res.headers.get('content-type') || '';
          const isJson = contentType.includes('application/json');
          const text = await res.text();
          let data;
          if (isJson) { try { data = JSON.parse(text); } catch { data = text.substring(0, 200); } }
          else { data = text.substring(0, 200); }
          return { success: true, data, status: res.status, isJson, isHtml: contentType.includes('text/html') };
        } catch (e) {
          return { success: false, error: String(e) };
        }
      })()
    `;

    const result: GggApiResponse<T & { isJson?: boolean; isHtml?: boolean }> = await win.webContents.executeJavaScript(fetchScript);

    if (!result.success) {
      throw new Error(`GGG API call failed: ${result.error}`);
    }

    if (result.status && result.status !== 200) {
      const bodyText = typeof result.data === 'string' ? result.data : JSON.stringify(result.data ?? '');
      throw makeGggError(result.status, bodyText, !!(result as any).isHtml);
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
