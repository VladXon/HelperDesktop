import { ipcMain } from 'electron';
import type { User, TokenData } from '@helper/shared';
import { apiFetch, HttpError } from '../utils/http-client.js';
import { readAuthStorage, writeAuthStorage, clearAuthStorage, getActiveAccount } from '../utils/safe-storage.js';
import { readDeviceId } from '../utils/safe-storage.js';
import type { AccountInfoLocal } from '../utils/types.js';

export function registerAuthIpc(): void {
  ipcMain.handle('auth:login', async (_e, login: string, password: string) => {
    const deviceId = await readDeviceId();
    const data = await apiFetch<{ token: string; refreshToken: string; expiresIn: number; user: User }>(
      '/api/auth/token',
      { method: 'POST', body: { login, password }, auth: false },
    );
    const storage = await readAuthStorage();
    const existing = storage.accounts.find((a) => a.login === login);
    const account: AccountInfoLocal = existing
      ? { ...existing, accessToken: data.token, refreshToken: data.refreshToken, userId: data.user.id, isDev: data.user.isDev, createdAt: data.user.createdAt }
      : { login, userId: data.user.id, isDev: data.user.isDev, createdAt: data.user.createdAt, accessToken: data.token, refreshToken: data.refreshToken, deviceId };
    const accounts = storage.accounts.filter((a) => a.login !== login).concat(account);
    await writeAuthStorage({ version: 1, activeAccount: login, accounts });
    return data;
  });

  ipcMain.handle('auth:save-token', async (_e, login: string, tokenData: { token: string; refreshToken: string; expiresIn: number; user: User }) => {
    const deviceId = await readDeviceId();
    const storage = await readAuthStorage();
    const existing = storage.accounts.find((a) => a.login === login);
    const account: AccountInfoLocal = existing
      ? { ...existing, accessToken: tokenData.token, refreshToken: tokenData.refreshToken, userId: tokenData.user.id, isDev: tokenData.user.isDev, createdAt: tokenData.user.createdAt }
      : { login, userId: tokenData.user.id, isDev: tokenData.user.isDev, createdAt: tokenData.user.createdAt, accessToken: tokenData.token, refreshToken: tokenData.refreshToken, deviceId };
    const accounts = storage.accounts.filter((a) => a.login !== login).concat(account);
    await writeAuthStorage({ version: 1, activeAccount: login, accounts });
  });

  ipcMain.handle('auth:logout', async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      if (!(e instanceof HttpError)) throw e;
    }
    await clearAuthStorage();
  });

  ipcMain.handle('auth:list-accounts', async () => {
    const storage = await readAuthStorage();
    return storage.accounts.map((a) => ({
      login: a.login,
      userId: a.userId,
      isDev: a.isDev,
      createdAt: a.createdAt,
    }));
  });

  ipcMain.handle('auth:switch-account', async (_e, login: string) => {
    const storage = await readAuthStorage();
    const acc = storage.accounts.find((a) => a.login === login);
    if (!acc) return null;
    await writeAuthStorage({ ...storage, activeAccount: login });
    const data = await apiFetch<{ user: User }>('/api/auth/me');
    return { token: acc.accessToken, refreshToken: acc.refreshToken, expiresIn: 86400, user: data.user };
  });

  ipcMain.handle('auth:remove-account', async (_e, login: string) => {
    const storage = await readAuthStorage();
    const accounts = storage.accounts.filter((a) => a.login !== login);
    const activeAccount = storage.activeAccount === login ? null : storage.activeAccount;
    await writeAuthStorage({ version: 1, activeAccount, accounts });
  });

  ipcMain.handle('auth:change-password', async (_e, current: string, next: string) => {
    return apiFetch<{ token: string; refreshToken: string; expiresIn: number }>('/api/auth/password', {
      method: 'PUT',
      body: { currentPassword: current, newPassword: next },
    });
  });

  ipcMain.handle('auth:set-email', async (_e, email: string, currentPassword: string) => {
    return apiFetch<{ user: User }>('/api/auth/email', {
      method: 'PUT',
      body: { email, currentPassword },
    });
  });

  ipcMain.handle('auth:get-me', async () => {
    const acc = await getActiveAccount();
    if (!acc) return null;
    try {
      const data = await apiFetch<{ user: User }>('/api/auth/me');
      return data.user;
    } catch {
      return null;
    }
  });
}
