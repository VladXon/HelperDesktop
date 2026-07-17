import type { DevServerInfo } from './types';

export async function getAllSettings(): Promise<Record<string, unknown>> {
  return window.api.settings.getAll();
}

export async function setMany(data: Record<string, unknown>): Promise<void> {
  return window.api.settings.setMany(data);
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  return window.api.settings.set(key, value);
}

export async function getServerUrl(): Promise<string> {
  return window.api.server.getUrl();
}

export async function setServerUrl(url: string): Promise<void> {
  return window.api.server.setUrl(url);
}

export async function testServer(): Promise<{ status: string; timestamp: string; version: string; db: string }> {
  return window.api.server.test();
}

export async function devServerInfo(): Promise<DevServerInfo> {
  return window.api.server.devServerInfo();
}

export async function devRestart(): Promise<void> {
  return window.api.server.devRestart();
}

export async function devOp(login: string): Promise<void> {
  return window.api.server.devOp(login);
}

export async function telegramStatus(): Promise<{ linked: boolean; telegramId?: number }> {
  return window.api.telegram.status();
}

export async function telegramLinkCode(): Promise<{ code: string; deepLink: string; expiresIn: number }> {
  return window.api.telegram.linkCode();
}

export async function telegramLinkCheck(code: string): Promise<{ status: 'pending' | 'linked' | 'expired' | 'not_found'; login?: string }> {
  return window.api.telegram.linkCheck(code);
}

export async function telegramUnlink(): Promise<void> {
  return window.api.telegram.unlink();
}
