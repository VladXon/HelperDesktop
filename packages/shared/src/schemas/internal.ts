import { z } from 'zod';

export const botQrLoginApproveSchema = z.object({
  token: z.string().min(1),
  telegramId: z.number().int().positive(),
  userId: z.number().int().positive().optional(),
  idempotencyKey: z.string().min(1).max(128).optional(),
});

export const botLinkByCodeSchema = z.object({
  code: z.string().min(1).max(64),
  telegramId: z.number().int().positive(),
  idempotencyKey: z.string().min(1).max(128).optional(),
});

export const botUnlinkByTelegramIdSchema = z.object({
  telegramId: z.number().int().positive(),
});

export const botMarkReminderSentSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(100),
});

export const botMarkNotifiedSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(100),
});

export const botMarkReadSchema = z.object({
  id: z.number().int().positive(),
});
