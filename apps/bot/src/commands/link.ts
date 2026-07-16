import { Bot, type Context, session, type SessionFlavor } from 'grammy';
import { mainMenu } from '../keyboards.js';
import { log } from '../logger.js';
import type { ServerClient } from '../api/server-client.js';
import { errorMessage } from './start.js';

export interface LinkSession {
  awaitingLink?: boolean;
}

export type BotContext = Context & SessionFlavor<LinkSession>;

export function registerLink(bot: Bot<BotContext>, server: ServerClient): void {
  bot.use(session<LinkSession, BotContext>({ initial: () => ({}) }));

  bot.command('link', async (ctx) => {
    ctx.session.awaitingLink = true;
    await ctx.reply(
      'Откройте приложение, сгенерируйте код привязки и отправьте его одним сообщением сюда.',
      { reply_markup: mainMenu() },
    );
  });

  bot.on('message:text', async (ctx, next) => {
    if (!ctx.session.awaitingLink) {
      await next();
      return;
    }
    const code = ctx.message.text.trim();
    const telegramId = ctx.from?.id;
    ctx.session.awaitingLink = false;
    if (!telegramId) {
      await ctx.reply('Не удалось определить Telegram ID.', { reply_markup: mainMenu() });
      return;
    }
    if (!code) {
      await ctx.reply('Код пустой. Попробуйте снова через /link.', { reply_markup: mainMenu() });
      return;
    }
    try {
      const result = await server.linkByCode(code, telegramId);
      await ctx.reply(`Аккаунт привязан: ${result.login}`, { reply_markup: mainMenu() });
    } catch (e) {
      log.error('link failed', { error: (e as Error).message });
      await ctx.reply(errorMessage(e, 'Не удалось привязать аккаунт'), {
        reply_markup: mainMenu(),
      });
    }
  });
}
