import { ipcMain } from 'electron';
import { apiFetch } from '../utils/http-client.js';

export function registerSettingsIpc(): void {
  ipcMain.handle('settings:get-all', async () => {
    const data = await apiFetch<{ data: Record<string, unknown> }>('/api/settings');
    return data.data;
  });

  ipcMain.handle('settings:get', async (_e, key: string) => {
    try {
      const data = await apiFetch<{ value: unknown }>(`/api/settings/${encodeURIComponent(key)}`);
      return data.value;
    } catch (e) {
      if ((e as { status?: number }).status === 404) return null;
      throw e;
    }
  });

  ipcMain.handle('settings:set', async (_e, key: string, value: unknown) => {
    await apiFetch(`/api/settings/${encodeURIComponent(key)}`, { method: 'PUT', body: { value } });
  });

  ipcMain.handle('settings:set-many', async (_e, data: Record<string, unknown>) => {
    await apiFetch('/api/settings/batch', { method: 'POST', body: { data } });
  });
}
