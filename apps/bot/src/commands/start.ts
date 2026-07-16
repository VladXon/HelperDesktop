import { Bot } from 'grammy';
import { mainMenu } from '../keyboards.js';
import { log } from '../logger.js';
import type { ServerClient } from '../api/server-client.js';
import type { BotContext } from './link.js';

export function registerStart(bot: Bot<BotContext>, server: ServerClient): void {
  bot.command('start', async (ctx) => {
    const payload = ctx.match?.trim() ?? '';
    const telegramId = ctx.from?.id;
    if (!telegramId) {
      await ctx.reply('Не удалось определить Telegram ID. Откройте бота из Telegram.', {
        reply_markup: mainMenu(),
      });
      return;
    }

    if (payload.startsWith('link_')) {
      const code = payload.slice('link_'.length);
      if (!code) {
        await ctx.reply('Код привязки пустой. Откройте приложение и получите новый код.', {
          reply_markup: mainMenu(),
        });
        return;
      }
      try {
        const result = await server.linkByCode(code, telegramId);
        await ctx.reply(`Аккаунт привязан: ${result.login}`, { reply_markup: mainMenu() });
      } catch (e) {
        const message = errorMessage(e, 'Не удалось привязать аккаунт');
        log.error('start/link-by-code failed', { error: (e as Error).message });
        await ctx.reply(message, { reply_markup: mainMenu() });
      }
      return;
    }

    if (payload.startsWith('login_')) {
      const token = payload.slice('login_'.length);
      if (!token) {
        await ctx.reply('Токен входа пустой. Откройте вкладку «Войти через QR» в приложении.', {
          reply_markup: mainMenu(),
        });
        return;
      }
      try {
        await server.userByTelegramId(telegramId);
      } catch (e) {
        if (isStatus(e, 404)) {
          await ctx.reply('Сначала привяжите аккаунт через /link.', { reply_markup: mainMenu() });
          return;
        }
        const message = errorMessage(e, 'Не удалось подтвердить аккаунт');
        log.error('start/user-by-telegram-id failed', { error: (e as Error).message });
        await ctx.reply(message, { reply_markup: mainMenu() });
        return;
      }
      try {
        await server.approveQrLogin(token, telegramId);
        await ctx.reply('Вход выполнен. Вернитесь в приложение.', { reply_markup: mainMenu() });
      } catch (e) {
        const message = errorMessage(e, 'Не удалось выполнить вход');
        log.error('start/qr-login-approve failed', { error: (e as Error).message });
        await ctx.reply(message, { reply_markup: mainMenu() });
      }
      return;
    }

    await ctx.reply('Главное меню', { reply_markup: mainMenu() });
  });

  bot.callbackQuery(/^cmd:(start|link|qr)$/, async (ctx: BotContext) => {
    const data = ctx.callbackQuery?.data ?? '';
    if (data === 'cmd:start') {
      await ctx.answerCallbackQuery();
      await ctx.reply('Главное меню', { reply_markup: mainMenu() });
      return;
    }
    if (data === 'cmd:link') {
      await ctx.answerCallbackQuery();
      await ctx.reply(
        'Откройте приложение, сгенерируйте код привязки и отправьте его одним сообщением сюда.',
        { reply_markup: mainMenu() },
      );
      return;
    }
    if (data === 'cmd:qr') {
      await ctx.answerCallbackQuery();
      await ctx.reply(
        'Чтобы войти через QR, откройте вкладку «Войти через QR» в приложении и отсканируйте код.',
        { reply_markup: mainMenu() },
      );
      return;
    }
    void ctx;
  });
}

export function errorMessage(e: unknown, fallback: string): string {
  if (e && typeof e === 'object' && 'status' in e) {
    const status = (e as { status: unknown }).status;
    if (status === 404) return `${fallback}: не найдено`;
    if (status === 409) return `${fallback}: конфликт`;
    if (status === 410) return `${fallback}: срок действия истек`;
    if (status === 401) return `${fallback}: доступ запрещен`;
  }
  return `${fallback}: ${(e as Error).message ?? 'ошибка сервера'}`;
}

export function isStatus(e: unknown, status: number): boolean {
  return Boolean(
    e && typeof e === 'object' && 'status' in e && (e as { status: unknown }).status === status,
  );
}
