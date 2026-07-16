import type { InlineKeyboard } from 'grammy';
import type { ServerClient } from './api/server-client.js';
import { dynamicMainMenu } from './keyboards.js';

export async function buildMenu(
  server: ServerClient,
  telegramId?: number,
): Promise<InlineKeyboard> {
  if (!telegramId) return dynamicMainMenu(false);
  try {
    await server.userByTelegramId(telegramId);
    return dynamicMainMenu(true);
  } catch {
    return dynamicMainMenu(false);
  }
}
