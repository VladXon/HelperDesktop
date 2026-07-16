import { ipcMain } from 'electron';
import type { TelegramStatus, LinkCodeResponse, LinkStatus, QrLoginRequestResponse, QrLoginStatus } from '@helper/shared';
import { apiFetch } from '../utils/http-client.js';

export function registerTelegramIpc(): void {
  ipcMain.handle('telegram:status', async () => {
    return apiFetch<TelegramStatus>('/api/telegram/status');
  });

  ipcMain.handle('telegram:link-code', async () => {
    return apiFetch<LinkCodeResponse>('/api/telegram/link/code', { method: 'POST', body: {} });
  });

  ipcMain.handle('telegram:link-check', async (_e, code: string) => {
    return apiFetch<LinkStatus>(`/api/telegram/link/check?code=${encodeURIComponent(code)}`);
  });

  ipcMain.handle('telegram:qr-login-request', async () => {
    return apiFetch<QrLoginRequestResponse>('/api/telegram/qr/login/request', { method: 'POST', body: {}, auth: false });
  });

  ipcMain.handle('telegram:qr-login-check', async (_e, token: string) => {
    return apiFetch<QrLoginStatus>(`/api/telegram/qr/login/check?token=${encodeURIComponent(token)}`, { auth: false });
  });

  ipcMain.handle('telegram:unlink', async () => {
    await apiFetch('/api/telegram/unlink', { method: 'POST', body: {} });
  });
}
