import { Bot } from 'grammy';
import { loadConfig } from './config.js';
import { log, logger } from './logger.js';
import { ServerClient } from './api/server-client.js';
import { registerStart } from './commands/start.js';
import { registerLink, type BotContext } from './commands/link.js';
import { registerMe } from './commands/me.js';
import { buildMenu } from './helpers.js';
import { createRemindersPoller } from './polling/reminders.js';
import { createNotificationsPoller } from './polling/notifications.js';

export interface BotRuntime {
  bot: Bot<BotContext>;
  server: ServerClient;
  config: ReturnType<typeof loadConfig>;
}

export function createBot(): BotRuntime {
  const config = loadConfig();
  for (const warning of config.warnings) {
    log.startup(warning);
  }

  if (!config.token) {
    log.error('BOT_TOKEN missing; cannot start');
    process.exit(0);
  }
  if (!config.sharedSecret) {
    log.info('BOT_SHARED_SECRET not set; server requests will be rejected with 401');
  }

  const bot = new Bot<BotContext>(config.token);
  const server = new ServerClient({
    baseUrl: config.serverUrl,
    sharedSecret: config.sharedSecret,
  });

  bot.catch((err) => {
    const message = err.error instanceof Error ? err.error.message : String(err.error);
    log.error('bot error', { error: message });
  });

  const lastBotMessage = new Map<number, number>();

  bot.use(async (ctx, next) => {
    const chatId = ctx.chat?.id;
    if (chatId && ctx.message && 'text' in ctx.message && typeof ctx.message.text === 'string' && ctx.message.text.startsWith('/')) {
      const prevId = lastBotMessage.get(chatId);
      if (prevId) {
        try { await ctx.api.deleteMessage(chatId, prevId); } catch {}
      }
    }
    await next();
  });

  bot.api.config.use(((prev: any) => {
    return async (method: any, payload: any, signal?: any) => {
      const result = await prev(method, payload, signal);
      if (method === 'sendMessage' && result?.message_id && payload?.chat_id) {
        lastBotMessage.set(Number(payload.chat_id), Number(result.message_id));
      }
      return result;
    };
  }) as any);

  bot.command('help', async (ctx) => {
    const text = [
      'Доступные команды:',
      '/start — главное меню',
      '/link — привязать аккаунт по коду',
      '/me — показать профиль',
      '/status — проверить состояние сервера',
      '/id — узнать ваш Telegram ID',
      '/logout — отвязать аккаунт',
      '/help — это сообщение',
    ].join('\n');
    const menu = await buildMenu(server, ctx.from?.id);
    await ctx.reply(text, { reply_markup: menu });
  });

  bot.command('id', async (ctx) => {
    const id = ctx.from?.id;
    const menu = await buildMenu(server, id);
    await ctx.reply(
      typeof id === 'number' ? `Ваш Telegram ID: ${id}` : 'Не удалось определить Telegram ID.',
      { reply_markup: menu },
    );
  });

  registerStart(bot, server);
  registerLink(bot, server);
  registerMe(bot, server);

  return { bot, server, config };
}

async function main(): Promise<void> {
  const { bot, server, config } = createBot();

  server.circuitState();
  log.startup('bot starting', {
    serverUrl: config.serverUrl,
    managed: config.isManaged,
    pollIntervalMs: config.pollIntervalMs,
    dbPath: config.dbPath,
  });

  const reminders = createRemindersPoller(bot, config.dbPath, { intervalMs: config.pollIntervalMs });
  const notifications = createNotificationsPoller(bot, config.dbPath, {
    intervalMs: config.pollIntervalMs,
  });

  let stopping = false;
  const shutdown = (signal: string): void => {
    if (stopping) return;
    stopping = true;
    log.shutdown('signal received, stopping', { signal });
    try {
      reminders.stop();
      notifications.stop();
    } catch (e) {
      log.error('poller stop error', { error: (e as Error).message });
    }
    bot.stop().catch((e) => {
      log.error('bot stop error', { error: (e as Error).message });
    });
    setTimeout(() => {
      log.shutdown('exit');
      process.exit(0);
    }, 2000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  try {
    await bot.start({
      onStart: (info) => {
        log.startup('bot started', { username: info.username });
      },
    });
  } catch (e) {
    logger.fatal('startup', 'bot failed to start', { error: (e as Error).message });
    process.exit(1);
  }
}

if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}` || process.env.BOT_AUTOSTART === '1') {
  main().catch((err) => {
    logger.fatal('startup', 'fatal during bootstrap', { error: err.message, stack: err.stack });
    process.exit(1);
  });
}

import type { Context } from 'grammy';
