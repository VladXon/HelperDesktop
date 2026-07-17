import { type Bot, type Context, session, type SessionFlavor } from 'grammy';
import { dynamicMainMenu } from '../keyboards.js';
import { log } from '../logger.js';
import type { ServerClient } from '../api/server-client.js';
import { errorMessage } from './start.js';

export interface LinkSession {
  awaitingLink?: boolean;
}

export type BotContext = Context & SessionFlavor<LinkSession>;

async function processLinkCode(server: ServerClient, ctx: BotContext, code: string): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId) {
    await ctx.reply('Не удалось определить Telegram ID.', { reply_markup: dynamicMainMenu(false) });
    return;
  }
  if (!code) {
    await ctx.reply('Код пустой. Попробуйте снова через /link.', { reply_markup: dynamicMainMenu(false) });
    return;
  }
  try {
    const result = await server.linkByCode(code, telegramId);
    await ctx.reply(`Аккаунт привязан: ${result.login}`, { reply_markup: dynamicMainMenu(true) });
  } catch (e) {
    log.error('link failed', { error: (e as Error).message });
    await ctx.reply(errorMessage(e, 'Не удалось привязать аккаунт'), {
      reply_markup: dynamicMainMenu(false),
    });
  }
}

export function registerLink(bot: Bot<BotContext>, server: ServerClient): void {
  bot.use(session<LinkSession, BotContext>({ initial: () => ({}) }));

  bot.command('link', async (ctx) => {
    const code = ctx.match?.trim() ?? '';
    if (code) {
      await processLinkCode(server, ctx, code);
      return;
    }
    ctx.session.awaitingLink = true;
    await ctx.reply(
      'Отправьте код привязки одним сообщением сюда.',
      { reply_markup: dynamicMainMenu(false) },
    );
  });

  bot.on('message:text', async (ctx, next) => {
    if (!ctx.session.awaitingLink) {
      await next();
      return;
    }
    ctx.session.awaitingLink = false;
    await processLinkCode(server, ctx, ctx.message.text.trim());
  });
}
