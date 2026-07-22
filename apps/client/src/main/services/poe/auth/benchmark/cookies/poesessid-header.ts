import type { CookieProvider, GggTransport } from '../types';

let _currentPoesessid: string | null = null;

export const poesessidHeaderProvider: CookieProvider = {
  id: 'poesessid-header',
  version: '1.0',
  description: 'POESESSID in Cookie header. Works with all transports. Does NOT modify session cookies.',

  async prepare(_transport: GggTransport): Promise<Record<string, string>> {
    if (!_currentPoesessid) return {};
    return { 'Cookie': `POESESSID=${_currentPoesessid}` };
  },

  async cleanup(_transport: GggTransport): Promise<void> {
    void 0;
  },
};

export function setHeaderPoesessid(poesessid: string): void {
  _currentPoesessid = poesessid;
}
