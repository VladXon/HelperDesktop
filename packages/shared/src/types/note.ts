export interface Note {
  id: number;
  userId: number;
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
  completed: boolean;
  reminderAt: number | null;
  notifyTelegram: boolean;
  telegramNotified: boolean;
  createdAt: string;
  updatedAt: string;
}
