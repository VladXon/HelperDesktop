import type { User, TokenData } from '@helper/shared';
import type { AccountSummary } from './types';

export async function login(login: string, password: string): Promise<TokenData> {
  return window.api.auth.login(login, password);
}

export async function listAccounts(): Promise<AccountSummary[]> {
  return window.api.auth.listAccounts();
}

export async function switchAccount(login: string): Promise<TokenData | null> {
  return window.api.auth.switchAccount(login);
}

export async function removeAccount(login: string): Promise<void> {
  await window.api.auth.removeAccount(login);
}

export async function getMe(): Promise<User | null> {
  return window.api.auth.getMe();
}

export async function changePassword(current: string, next: string): Promise<{ token: string; refreshToken: string; expiresIn: number }> {
  return window.api.auth.changePassword(current, next);
}

export async function setEmail(email: string, currentPassword: string): Promise<{ user: User }> {
  return window.api.auth.setEmail(email, currentPassword);
}
