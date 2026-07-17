import type { Bot } from 'grammy';
import { dynamicMainMenu } from '../keyboards.js';
import { buildMenu } from '../helpers.js';
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

function statusText(h: { status: string; version: string; db: string; timestamp: string }): string {
  const ts = h.timestamp ? new Date(h.timestamp).toLocaleString('ru-RU') : '';
  return [
    `Сервер: ${h.status === 'ok' ? 'доступен' : h.status}`,
    `БД: ${h.db === 'ok' ? 'доступна' : h.db}`,
    `Версия: v${h.version}`,
    ...(ts ? [`Время: ${ts}`] : []),
  ].join('\n');
}

export function registerMe(bot: Bot<BotContext>, server: ServerClient): void {
  bot.command('me', async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) {
      await ctx.reply('Не удалось определить Telegram ID.', { reply_markup: dynamicMainMenu(false) });
      return;
    }
    try {
      const user = await server.userByTelegramId(telegramId);
      const lines = [
        `Логин: ${user.login}`,
        `Dev: ${user.is_dev ? 'да' : 'нет'}`,
      ];
      await ctx.reply(lines.join('\n'), { reply_markup: dynamicMainMenu(true) });
    } catch (e) {
      if (isStatus(e, 404)) {
        await ctx.reply('Аккаунт не привязан. Используйте /link.', { reply_markup: dynamicMainMenu(false) });
        return;
      }
      log.error('me failed', { error: (e as Error).message });
      await ctx.reply(errorMessage(e, 'Не удалось получить профиль'), { reply_markup: dynamicMainMenu(false) });
    }
  });

  bot.command('status', async (ctx) => {
    const telegramId = ctx.from?.id;
    try {
      const h = await server.health();
      const menu = await buildMenu(server, telegramId);
      await ctx.reply(statusText(h), { reply_markup: menu });
    } catch (e) {
      log.error('status failed', { error: (e as Error).message });
      const menu = await buildMenu(server, telegramId);
      await ctx.reply('Сервер недоступен', { reply_markup: menu });
    }
  });

  bot.command('logout', async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) {
      await ctx.reply('Не удалось определить Telegram ID.', { reply_markup: dynamicMainMenu(false) });
      return;
    }
    try {
      await server.unlinkByTelegramId(telegramId);
      await ctx.reply('Аккаунт отвязан', { reply_markup: dynamicMainMenu(false) });
    } catch (e) {
      log.error('logout failed', { error: (e as Error).message });
      await ctx.reply(errorMessage(e, 'Не удалось отвязать аккаунт'), { reply_markup: dynamicMainMenu(false) });
    }
  });

  bot.callbackQuery(/^cmd:(me|status|id|help|logout)$/, async (ctx: BotContext) => {
    const data = ctx.callbackQuery?.data ?? '';
    if (data === 'cmd:help') {
      await ctx.answerCallbackQuery();
      const menu = await buildMenu(server, ctx.from?.id);
      await ctx.editMessageText(HELP_TEXT, { reply_markup: menu });
      return;
    }
    if (data === 'cmd:id') {
      const id = ctx.from?.id;
      await ctx.answerCallbackQuery();
      const menu = await buildMenu(server, id);
      await ctx.editMessageText(
        typeof id === 'number' ? `Ваш Telegram ID: ${id}` : 'Не удалось определить Telegram ID.',
        { reply_markup: menu },
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
    await ctx.editMessageText('Не удалось определить Telegram ID.', { reply_markup: dynamicMainMenu(false) });
    return;
  }
  try {
    const user = await server.userByTelegramId(telegramId);
    const lines = [`Логин: ${user.login}`, `Dev: ${user.is_dev ? 'да' : 'нет'}`];
    await ctx.editMessageText(lines.join('\n'), { reply_markup: dynamicMainMenu(true) });
  } catch (e) {
    if (isStatus(e, 404)) {
      await ctx.editMessageText('Аккаунт не привязан. Используйте /link.', { reply_markup: dynamicMainMenu(false) });
      return;
    }
    log.error('callback me failed', { error: (e as Error).message });
    await ctx.editMessageText(errorMessage(e, 'Не удалось получить профиль'), { reply_markup: dynamicMainMenu(false) });
  }
}

async function invokeStatus(ctx: BotContext, server: ServerClient): Promise<void> {
  const telegramId = ctx.from?.id;
  try {
    const h = await server.health();
    const menu = await buildMenu(server, telegramId);
    await ctx.editMessageText(statusText(h), { reply_markup: menu });
  } catch (e) {
    log.error('callback status failed', { error: (e as Error).message });
    const menu = await buildMenu(server, telegramId);
    await ctx.editMessageText('Сервер недоступен', { reply_markup: menu });
  }
}

async function invokeLogout(ctx: BotContext, server: ServerClient): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId) {
    await ctx.editMessageText('Не удалось определить Telegram ID.', { reply_markup: dynamicMainMenu(false) });
    return;
  }
  try {
    await server.unlinkByTelegramId(telegramId);
    await ctx.editMessageText('Аккаунт отвязан', { reply_markup: dynamicMainMenu(false) });
  } catch (e) {
    log.error('callback logout failed', { error: (e as Error).message });
    await ctx.editMessageText(errorMessage(e, 'Не удалось отвязать аккаунт'), { reply_markup: dynamicMainMenu(false) });
  }
}
