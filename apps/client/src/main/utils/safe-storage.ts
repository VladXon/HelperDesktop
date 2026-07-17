import { app, safeStorage } from 'electron';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import type { AuthStorage, AccountInfoLocal } from './types.js';

const AUTH_FILE = 'auth.json';
const ENC_PREFIX = 'enc:';
const DEVICE_FILE = 'device.json';

function userDataPath(name: string): string {
  return join(app.getPath('userData'), name);
}

function encryptionAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

function encrypt(value: string): string {
  if (!encryptionAvailable()) throw new Error('Encryption is not available on this system');
  try {
    const buf = safeStorage.encryptString(value);
    return ENC_PREFIX + buf.toString('base64');
  } catch {
    throw new Error('Failed to encrypt data');
  }
}

function decrypt(value: string): string | null {
  if (!value.startsWith(ENC_PREFIX)) return value;
  if (!encryptionAvailable()) return null;
  try {
    const buf = Buffer.from(value.slice(ENC_PREFIX.length), 'base64');
    return safeStorage.decryptString(buf);
  } catch {
    return null;
  }
}

export async function readJson<T>(file: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(userDataPath(file), 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeJson(file: string, data: unknown): Promise<void> {
  const target = userDataPath(file);
  const tmp = `${target}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8');
  await fs.rename(tmp, target);
}

export async function readAuthStorage(): Promise<AuthStorage> {
  const data = await readJson<AuthStorage>(AUTH_FILE);
  if (data?.version !== 1) {
    return { version: 1, activeAccount: null, accounts: [] };
  }
  const decrypted: AccountInfoLocal[] = [];
  for (const acc of data.accounts) {
    const access = decrypt(acc.accessToken);
    const refresh = decrypt(acc.refreshToken);
    if (access === null || refresh === null) {
      continue;
    }
    decrypted.push({
      ...acc,
      accessToken: access,
      refreshToken: refresh,
    });
  }
  return { version: 1, activeAccount: data.activeAccount, accounts: decrypted };
}

export async function writeAuthStorage(storage: AuthStorage): Promise<void> {
  const toStore: AuthStorage = {
    version: 1,
    activeAccount: storage.activeAccount,
    accounts: storage.accounts.map((acc) => ({
      ...acc,
      accessToken: encrypt(acc.accessToken),
      refreshToken: encrypt(acc.refreshToken),
    })),
  };
  await writeJson(AUTH_FILE, toStore);
}

export async function clearAuthStorage(): Promise<void> {
  await writeAuthStorage({ version: 1, activeAccount: null, accounts: [] });
}

export async function getActiveAccount(): Promise<AccountInfoLocal | null> {
  const storage = await readAuthStorage();
  if (!storage.activeAccount) return null;
  return storage.accounts.find((a) => a.login === storage.activeAccount) ?? null;
}

export async function readDeviceId(): Promise<string> {
  type DeviceFile = { deviceId: string };
  const data = await readJson<DeviceFile>(DEVICE_FILE);
  if (data?.deviceId) return data.deviceId;
  const deviceId = crypto.randomUUID();
  await writeJson(DEVICE_FILE, { deviceId });
  return deviceId;
}

export { encryptionAvailable };
