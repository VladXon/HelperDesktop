import type { User } from '@helper/shared';

export type { User };

export interface AccountSummary {
  login: string;
  userId: number;
  isDev: boolean;
  createdAt: string;
}
