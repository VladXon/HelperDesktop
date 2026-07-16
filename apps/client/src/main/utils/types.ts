import type { AccountInfo, User } from '@helper/shared';

export interface AccountInfoLocal {
  login: string;
  userId: number;
  isDev: boolean;
  createdAt: string;
  accessToken: string;
  refreshToken: string;
  deviceId: string;
}

export interface AuthStorage {
  version: 1;
  activeAccount: string | null;
  accounts: AccountInfoLocal[];
}

export interface ServerUrlFile {
  url: string;
}

export type { AccountInfo, User };
