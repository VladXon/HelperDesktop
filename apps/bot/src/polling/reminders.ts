import type { Bot } from 'grammy';
import { openNoteButton } from '../keyboards.js';
import { log } from '../logger.js';
import type { ServerClient } from '../api/server-client.js';
import type { BotContext } from '../commands/link.js';

export interface RemindersPoller {
  tick: () => Promise<number>;
  stop: () => void;
}

export function createRemindersPoller(
  bot: Bot<BotContext>,
  server: ServerClient,
  _dbPath: string,
  options: { intervalMs: number; now?: () => number; onError?: (err: Error) => void } = { intervalMs: 30_000 },
): RemindersPoller {
  const tick = async (): Promise<number> => {
    const { rows } = await server.getPendingReminders();
    if (rows.length === 0) return 0;
    const ids = rows.map((r) => r.id);
    await server.markReminderSent(ids);
    for (const row of rows) {
      const preview = (row.body ?? '').slice(0, 200);
      const text = `Напоминание: ${row.title}\n\n${preview}`;
      try {
        await bot.api.sendMessage(row.telegramId, text, {
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
    },
  };
}
