import { Bot } from 'grammy';
import { mainMenu, unlinkConfirm } from '../keyboards.js';
import { log } from '../logger.js';
import type { ServerClient } from '../api/server-client.js';
import { errorMessage, isStatus } from './start.js';
import type { BotContext } from './link.js';

const HELP_TEXT = [
  'Доступные команды:',
  '/start — главное меню',
  '/link — привязать аккаунт по коду',
  '/me — показать профиль',
  '/status — проверить состояние сервера',
  '/id — узнать ваш Telegram ID',
  '/logout — отвязать аккаунт',
  '/help — это сообщение',
].join('\n');

export function registerMe(bot: Bot<BotContext>, server: ServerClient): void {
  bot.command('me', async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) {
      await ctx.reply('Не удалось определить Telegram ID.', { reply_markup: mainMenu() });
      return;
    }
    try {
      const user = await server.userByTelegramId(telegramId);
      const lines = [
        `Логин: ${user.login}`,
        `Dev: ${user.is_dev ? 'да' : 'нет'}`,
      ];
      await ctx.reply(lines.join('\n'), { reply_markup: mainMenu() });
    } catch (e) {
      if (isStatus(e, 404)) {
        await ctx.reply('Аккаунт не привязан. Используйте /link.', { reply_markup: mainMenu() });
        return;
      }
      log.error('me failed', { error: (e as Error).message });
      await ctx.reply(errorMessage(e, 'Не удалось получить профиль'), { reply_markup: mainMenu() });
    }
  });

  bot.command('status', async (ctx) => {
    try {
      const h = await server.health();
      await ctx.reply(`Сервер доступен (v${h.version})`, { reply_markup: mainMenu() });
    } catch (e) {
      log.error('status failed', { error: (e as Error).message });
      await ctx.reply('Сервер недоступен', { reply_markup: mainMenu() });
    }
  });

  bot.command('id', async (ctx) => {
    const id = ctx.from?.id;
    if (typeof id !== 'number') {
      await ctx.answerCallbackQuery?.();
      await ctx.reply('Не удалось определить Telegram ID.', { reply_markup: mainMenu() });
      return;
    }
    await ctx.reply(`Ваш Telegram ID: ${id}`, { reply_markup: mainMenu() });
  });

  bot.command('logout', async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) {
      await ctx.reply('Не удалось определить Telegram ID.', { reply_markup: mainMenu() });
      return;
    }
    try {
      await server.unlinkByTelegramId(telegramId);
      await ctx.reply('Аккаунт отвязан', { reply_markup: unlinkConfirm() });
    } catch (e) {
      log.error('logout failed', { error: (e as Error).message });
      await ctx.reply(errorMessage(e, 'Не удалось отвязать аккаунт'), { reply_markup: mainMenu() });
    }
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(HELP_TEXT, { reply_markup: mainMenu() });
  });

  bot.callbackQuery(/^cmd:(me|status|id|help|logout)$/, async (ctx: BotContext) => {
    const data = ctx.callbackQuery?.data ?? '';
    if (data === 'cmd:help') {
      await ctx.answerCallbackQuery();
      await ctx.reply(HELP_TEXT, { reply_markup: mainMenu() });
      return;
    }
    if (data === 'cmd:id') {
      const id = ctx.from?.id;
      await ctx.answerCallbackQuery();
      await ctx.reply(
        typeof id === 'number' ? `Ваш Telegram ID: ${id}` : 'Не удалось определить Telegram ID.',
        { reply_markup: mainMenu() },
      );
      return;
    }
    if (data === 'cmd:me') {
      await ctx.answerCallbackQuery();
      await invokeMe(ctx, server);
      return;
    }
    if (data === 'cmd:status') {
      await ctx.answerCallbackQuery();
      await invokeStatus(ctx, server);
      return;
    }
    if (data === 'cmd:logout') {
      await ctx.answerCallbackQuery();
      await invokeLogout(ctx, server);
      return;
    }
  });
}

async function invokeMe(ctx: BotContext, server: ServerClient): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId) {
    await ctx.reply('Не удалось определить Telegram ID.', { reply_markup: mainMenu() });
    return;
  }
  try {
    const user = await server.userByTelegramId(telegramId);
    const lines = [`Логин: ${user.login}`, `Dev: ${user.is_dev ? 'да' : 'нет'}`];
    await ctx.reply(lines.join('\n'), { reply_markup: mainMenu() });
  } catch (e) {
    if (isStatus(e, 404)) {
      await ctx.reply('Аккаунт не привязан. Используйте /link.', { reply_markup: mainMenu() });
      return;
    }
    log.error('callback me failed', { error: (e as Error).message });
    await ctx.reply(errorMessage(e, 'Не удалось получить профиль'), { reply_markup: mainMenu() });
  }
}

async function invokeStatus(ctx: BotContext, server: ServerClient): Promise<void> {
  try {
    const h = await server.health();
    await ctx.reply(`Сервер доступен (v${h.version})`, { reply_markup: mainMenu() });
  } catch (e) {
    log.error('callback status failed', { error: (e as Error).message });
    await ctx.reply('Сервер недоступен', { reply_markup: mainMenu() });
  }
}

async function invokeLogout(ctx: BotContext, server: ServerClient): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId) {
    await ctx.reply('Не удалось определить Telegram ID.', { reply_markup: mainMenu() });
    return;
  }
  try {
    await server.unlinkByTelegramId(telegramId);
    await ctx.reply('Аккаунт отвязан', { reply_markup: unlinkConfirm() });
  } catch (e) {
    log.error('callback logout failed', { error: (e as Error).message });
    await ctx.reply(errorMessage(e, 'Не удалось отвязать аккаунт'), { reply_markup: mainMenu() });
  }
}
