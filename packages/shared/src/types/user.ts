export interface User {
  id: number;
  login: string;
  name: string;
  email: string;
  isDev: boolean;
  createdAt: string;
}

export interface TokenData {
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface AccountInfo {
  login: string;
  userId: number;
  isDev: boolean;
  createdAt: string;
  lastUsedAt: number;
}
