import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { existsSync } from 'node:fs';
import type { Bot } from 'grammy';
import { openNoteButton } from '../keyboards.js';
import { log } from '../logger.js';
import type { ServerClient } from '../api/server-client.js';
import type { BotContext } from '../commands/link.js';

export interface ReminderRow {
  id: number;
  title: string;
  body: string;
  telegram_id: number;
}

const SELECT_REMINDERS_SQL = `
  SELECT n.id AS id, n.title AS title, n.body AS body, t.telegram_id AS telegram_id
  FROM notes n
  JOIN telegram_links t ON t.user_id = n.user_id
  WHERE n.reminder_at IS NOT NULL
    AND n.reminder_at <= ?
    AND n.completed = 0
    AND t.telegram_id IS NOT NULL
`;

export interface RemindersPoller {
  tick: () => Promise<number>;
  stop: () => void;
}

export function createRemindersPoller(
  bot: Bot<BotContext>,
  server: ServerClient,
  dbPath: string,
  options: { intervalMs: number; now?: () => number; onError?: (err: Error) => void } = { intervalMs: 30_000 },
): RemindersPoller {
  const readDb = openReadOnly(dbPath);
  const select = readDb.prepare<[number], ReminderRow>(SELECT_REMINDERS_SQL);
  const now = options.now ?? (() => Math.floor(Date.now() / 1000));

  const tick = async (): Promise<number> => {
    const rows = select.all(now());
    if (rows.length === 0) return 0;
    const ids = rows.map((r) => r.id);
    await server.markReminderSent(ids);
    for (const row of rows) {
      const preview = (row.body ?? '').slice(0, 200);
      const text = `Напоминание: ${row.title}\n\n${preview}`;
      try {
        await bot.api.sendMessage(row.telegram_id, text, {
          reply_markup: openNoteButton(row.id, 'helperdesktop://note/'),
        });
      } catch (e) {
        const err = e as Error;
        log.error('reminder send failed', { id: row.id, error: err.message });
        options.onError?.(err);
      }
    }
    return rows.length;
  };

  const handle = setInterval(() => {
    void tick().catch((e) => {
      log.error('reminders tick failed', { error: (e as Error).message });
    });
  }, options.intervalMs);
  handle.unref();

  return {
    tick,
    stop: () => {
      clearInterval(handle);
      readDb.close();
    },
  };
}

function openReadOnly(path: string): DatabaseType {
  const resolved = resolveDbPath(path);
  if (!existsSync(resolved)) {
    throw new Error(`db not found: ${resolved}`);
  }
  return new Database(resolved, { readonly: true, fileMustExist: true });
}

function resolveDbPath(path: string): string {
  if (path.startsWith('/') || /^[A-Z]:/i.test(path)) return path;
  return `${process.cwd().replace(/\\/g, '/')}/${path.replace(/\\/g, '/')}`;
}
