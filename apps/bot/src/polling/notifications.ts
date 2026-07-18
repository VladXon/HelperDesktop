import type { Bot } from 'grammy';
import { notificationActions } from '../keyboards.js';
import { log } from '../logger.js';
import type { ServerClient } from '../api/server-client.js';
import type { BotContext } from '../commands/link.js';

export interface NotificationsPoller {
  tick: () => Promise<number>;
  stop: () => void;
}

export function createNotificationsPoller(
  bot: Bot<BotContext>,
  server: ServerClient,
  _dbPath: string,
  options: { intervalMs: number; onError?: (err: Error) => void } = { intervalMs: 30_000 },
): NotificationsPoller {
  const tick = async (): Promise<number> => {
    const { rows } = await server.getPendingNotifications();
    if (rows.length === 0) return 0;
    const ids = rows.map((r) => r.id);
    await server.markNotified(ids);
    for (const row of rows) {
      const preview = (row.body ?? '').slice(0, 200);
      const text = `${row.title}\n\n${preview}`;
      try {
        await bot.api.sendMessage(row.telegramId, text, {
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
    },
  };
}
