import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { existsSync } from 'node:fs';
import type { Bot } from 'grammy';
import { notificationActions } from '../keyboards.js';
import { log } from '../logger.js';
import type { ServerClient } from '../api/server-client.js';
import type { BotContext } from '../commands/link.js';

export interface NotificationRow {
  id: number;
  title: string;
  body: string;
  telegram_id: number;
}

const SELECT_NOTIFICATIONS_SQL = `
  SELECT n.id AS id, n.title AS title, n.body AS body, t.telegram_id AS telegram_id
  FROM notes n
  JOIN telegram_links t ON t.user_id = n.user_id
  WHERE n.notify_telegram = 1
    AND n.telegram_notified = 0
    AND t.telegram_id IS NOT NULL
`;

export interface NotificationsPoller {
  tick: () => Promise<number>;
  stop: () => void;
}

export function createNotificationsPoller(
  bot: Bot<BotContext>,
  server: ServerClient,
  dbPath: string,
  options: { intervalMs: number; onError?: (err: Error) => void } = { intervalMs: 30_000 },
): NotificationsPoller {
  const readDb = openReadOnly(dbPath);
  const select = readDb.prepare<[], NotificationRow>(SELECT_NOTIFICATIONS_SQL);

  const tick = async (): Promise<number> => {
    const rows = select.all();
    if (rows.length === 0) return 0;
    const ids = rows.map((r) => r.id);
    await server.markNotified(ids);
    for (const row of rows) {
      const preview = (row.body ?? '').slice(0, 200);
      const text = `${row.title}\n\n${preview}`;
      try {
        await bot.api.sendMessage(row.telegram_id, text, {
          reply_markup: notificationActions(row.id, 'helperdesktop://note/'),
        });
      } catch (e) {
        const err = e as Error;
        log.error('notification send failed', { id: row.id, error: err.message });
        options.onError?.(err);
      }
    }
    return rows.length;
  };

  const handle = setInterval(() => {
    void tick().catch((e) => {
      log.error('notifications tick failed', { error: (e as Error).message });
    });
  }, options.intervalMs);
  handle.unref();

  bot.callbackQuery(/^note:read:\d+$/, async (ctx) => {
    const data = ctx.callbackQuery?.data ?? '';
    const m = /^note:read:(\d+)$/.exec(data);
    if (!m) {
      await ctx.answerCallbackQuery();
      return;
    }
    const id = Number.parseInt(m[1] ?? '', 10);
    if (!Number.isFinite(id) || id <= 0) {
      await ctx.answerCallbackQuery({ text: 'Некорректный идентификатор', show_alert: true });
      return;
    }
    try {
      await server.markRead(id);
      await ctx.answerCallbackQuery({ text: 'Отмечено прочитанным' });
    } catch (e) {
      log.error('note:read failed', { error: (e as Error).message });
      await ctx.answerCallbackQuery({ text: 'Не удалось обновить' });
    }
  });

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
