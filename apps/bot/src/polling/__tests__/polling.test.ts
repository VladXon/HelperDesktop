import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRemindersPoller } from '../reminders.js';
import { createNotificationsPoller } from '../notifications.js';

interface FakeBot {
  api: { sendMessage: ReturnType<typeof vi.fn> };
  callbackQuery: ReturnType<typeof vi.fn>;
  captured: Array<{ chatId: number; text: string; replyMarkup: unknown }>;
  callbackRegistrations: Array<{ pattern: RegExp; handler: unknown }>;
}

function makeFakeServer(): {
  markReminderSent: ReturnType<typeof vi.fn>;
  markNotified: ReturnType<typeof vi.fn>;
  markRead: ReturnType<typeof vi.fn>;
} {
  return {
    markReminderSent: vi.fn(async () => undefined),
    markNotified: vi.fn(async () => undefined),
    markRead: vi.fn(async () => undefined),
  };
}

function makeFakeBot(): FakeBot {
  const captured: FakeBot['captured'] = [];
  const callbackRegistrations: FakeBot['callbackRegistrations'] = [];
  const sendMessage = vi.fn(async (chatId: number, text: string, opts?: { reply_markup?: unknown }) => {
    captured.push({ chatId, text, replyMarkup: opts?.reply_markup });
    return { message_id: captured.length };
  });
  const callbackQuery = vi.fn((pattern: RegExp, handler: unknown) => {
    callbackRegistrations.push({ pattern, handler });
  });
  return { api: { sendMessage }, callbackQuery, captured, callbackRegistrations };
}

function createTestDb(): { dbPath: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'bot-poller-'));
  const dbPath = join(dir, 'test.db');
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE users (id INTEGER PRIMARY KEY, login TEXT NOT NULL);
    CREATE TABLE telegram_links (
      user_id INTEGER PRIMARY KEY,
      telegram_id INTEGER NOT NULL
    );
    CREATE TABLE notes (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      completed INTEGER NOT NULL DEFAULT 0,
      reminder_at INTEGER,
      notify_telegram INTEGER NOT NULL DEFAULT 0,
      telegram_notified INTEGER NOT NULL DEFAULT 0
    );
  `);
  db.close();
  return {
    dbPath,
    cleanup: () => {
      try {
        rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
      } catch {
        // ignore cleanup failures on Windows
      }
    },
  };
}

function insertLink(dbPath: string, userId: number, telegramId: number): void {
  const db = new Database(dbPath);
  db.prepare('INSERT INTO users (id, login) VALUES (?, ?)').run(userId, `u${userId}`);
  db.prepare('INSERT INTO telegram_links (user_id, telegram_id) VALUES (?, ?)').run(userId, telegramId);
  db.close();
}

function insertNote(
  dbPath: string,
  note: {
    id?: number;
    userId: number;
    title: string;
    body: string;
    completed?: number;
    reminderAt?: number | null;
    notifyTelegram?: number;
    telegramNotified?: number;
  },
): number {
  const db = new Database(dbPath);
  const stmt = db.prepare(
    `INSERT INTO notes (user_id, title, body, completed, reminder_at, notify_telegram, telegram_notified)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const res = stmt.run(
    note.userId,
    note.title,
    note.body,
    note.completed ?? 0,
    note.reminderAt ?? null,
    note.notifyTelegram ?? 0,
    note.telegramNotified ?? 0,
  );
  db.close();
  return Number(res.lastInsertRowid);
}

describe('reminders poller', () => {
  let setup: ReturnType<typeof createTestDb>;
  beforeEach(() => {
    setup = createTestDb();
  });
  afterEach(() => {
    setup.cleanup();
  });

  it('sends reminder and clears reminder_at', async () => {
    insertLink(setup.dbPath, 1, 100);
    const noteId = insertNote(setup.dbPath, {
      userId: 1,
      title: 'Test',
      body: 'Body text',
      reminderAt: 100,
    });
    const bot = makeFakeBot();
    const server = makeFakeServer();
    const poller = createRemindersPoller(bot as unknown as Parameters<typeof createRemindersPoller>[0], server, setup.dbPath, {
      intervalMs: 1_000_000,
      now: () => 1000,
    });
    const sent = await poller.tick();
    expect(sent).toBe(1);
    expect(bot.captured).toHaveLength(1);
    expect(bot.captured[0]?.chatId).toBe(100);
    expect(bot.captured[0]?.text).toContain('Напоминание: Test');
    expect(bot.captured[0]?.text).toContain('Body text');
    expect(server.markReminderSent).toHaveBeenCalledWith([noteId]);
    poller.stop();
  });

  it('skips future reminders', async () => {
    insertLink(setup.dbPath, 1, 100);
    insertNote(setup.dbPath, {
      userId: 1,
      title: 'Future',
      body: '',
      reminderAt: 5000,
    });
    const bot = makeFakeBot();
    const server = makeFakeServer();
    const poller = createRemindersPoller(bot as unknown as Parameters<typeof createRemindersPoller>[0], server, setup.dbPath, {
      intervalMs: 1_000_000,
      now: () => 1000,
    });
    const sent = await poller.tick();
    expect(sent).toBe(0);
    expect(bot.captured).toHaveLength(0);
    expect(server.markReminderSent).not.toHaveBeenCalled();
    poller.stop();
  });

  it('truncates body to 200 chars', async () => {
    insertLink(setup.dbPath, 1, 100);
    insertNote(setup.dbPath, {
      userId: 1,
      title: 'Long',
      body: 'x'.repeat(500),
      reminderAt: 100,
    });
    const bot = makeFakeBot();
    const server = makeFakeServer();
    const poller = createRemindersPoller(bot as unknown as Parameters<typeof createRemindersPoller>[0], server, setup.dbPath, {
      intervalMs: 1_000_000,
      now: () => 1000,
    });
    await poller.tick();
    expect(bot.captured[0]?.text.length).toBeLessThanOrEqual(200 + 'Напоминание: Long\n\n'.length);
    poller.stop();
  });
});

describe('notifications poller', () => {
  let setup: ReturnType<typeof createTestDb>;
  beforeEach(() => {
    setup = createTestDb();
  });
  afterEach(() => {
    setup.cleanup();
  });

  it('sends notification and marks telegram_notified', async () => {
    insertLink(setup.dbPath, 1, 100);
    const noteId = insertNote(setup.dbPath, {
      userId: 1,
      title: 'Notify',
      body: 'body',
      notifyTelegram: 1,
    });
    const bot = makeFakeBot();
    const server = makeFakeServer();
    const poller = createNotificationsPoller(bot as unknown as Parameters<typeof createNotificationsPoller>[0], server, setup.dbPath, {
      intervalMs: 1_000_000,
    });
    const sent = await poller.tick();
    expect(sent).toBe(1);
    expect(bot.captured[0]?.text).toContain('Notify');
    expect(bot.captured[0]?.text).toContain('body');
    expect(server.markNotified).toHaveBeenCalledWith([noteId]);
    poller.stop();
  });

  it('does not re-send already notified', async () => {
    insertLink(setup.dbPath, 1, 100);
    insertNote(setup.dbPath, {
      userId: 1,
      title: 'X',
      body: '',
      notifyTelegram: 1,
      telegramNotified: 1,
    });
    const bot = makeFakeBot();
    const server = makeFakeServer();
    const poller = createNotificationsPoller(bot as unknown as Parameters<typeof createNotificationsPoller>[0], server, setup.dbPath, {
      intervalMs: 1_000_000,
    });
    const sent = await poller.tick();
    expect(sent).toBe(0);
    expect(bot.captured).toHaveLength(0);
    expect(server.markNotified).not.toHaveBeenCalled();
    poller.stop();
  });
});
