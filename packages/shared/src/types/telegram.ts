export interface TelegramStatus {
  linked: boolean;
  telegramId?: number;
}

export interface LinkCodeResponse {
  code: string;
  expiresIn: number;
}

export type LinkStatus =
  | { status: 'pending' }
  | { status: 'linked'; login: string }
  | { status: 'expired' }
  | { status: 'not_found' };

export interface QrLoginRequestResponse {
  token: string;
  deepLink: string;
  expiresIn: number;
}

export type QrLoginStatus =
  | { status: 'pending' }
  | {
      status: 'approved';
      session: {
        token: string;
        refreshToken: string;
        expiresIn: number;
        user: import('./user.js').User;
      };
    }
  | { status: 'expired' }
  | { status: 'not_found' };
