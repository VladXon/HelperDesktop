import { session } from 'electron';
import type { CookieProvider, GggTransport } from '../types';

const GGG_URL = 'https://www.pathofexile.com';

let _currentPoesessid: string | null = null;

export const chromiumSessionProvider: CookieProvider = {
  id: 'chromium-session',
  version: '1.0',
  description: 'Sets POESESSID on Chromium defaultSession. Works with net.request({useSessionCookies:true}). Cloudflare cookies accumulate naturally.',

  async prepare(_transport: GggTransport): Promise<Record<string, string>> {
    if (!_currentPoesessid) return {};

    const ses = session.defaultSession;
    await ses.cookies.set({
      url: GGG_URL,
      name: 'POESESSID',
      value: _currentPoesessid,
      domain: '.pathofexile.com',
      path: '/',
      secure: true,
      sameSite: 'lax',
    });
    return {};
  },

  async cleanup(_transport: GggTransport): Promise<void> {
    if (!_currentPoesessid) return;
    const ses = session.defaultSession;
    try {
      await ses.cookies.remove(GGG_URL, 'POESESSID');
    } catch {
      /* best-effort */
    }
  },
};

export function setSessionPoesessid(poesessid: string): void {
  _currentPoesessid = poesessid;
}
