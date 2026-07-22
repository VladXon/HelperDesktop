import { session } from 'electron';
import type { CookieProvider, GggTransport } from '../types';

const GGG_URL = 'https://www.pathofexile.com';

let _currentPoesessid: string | null = null;

export const clearedCookiesProvider: CookieProvider = {
  id: 'cleared-cookies',
  version: '1.0',
  description: 'Clears ALL cookies on defaultSession, then sets only POESESSID. Simulates fresh session.',

  async prepare(_transport: GggTransport): Promise<Record<string, string>> {
    const ses = session.defaultSession;
    await ses.clearStorageData({ storages: ['cookies'] });

    if (_currentPoesessid) {
      await ses.cookies.set({
        url: GGG_URL,
        name: 'POESESSID',
        value: _currentPoesessid,
        domain: '.pathofexile.com',
        path: '/',
        secure: true,
        sameSite: 'lax',
      });
    }
    return {};
  },

  async cleanup(_transport: GggTransport): Promise<void> {
    void 0;
  },
};

export function setClearedPoesessid(poesessid: string): void {
  _currentPoesessid = poesessid;
}
