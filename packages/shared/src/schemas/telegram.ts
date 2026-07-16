import { z } from 'zod';

export const telegramStatusSchema = z.object({
  linked: z.boolean(),
  telegramId: z.number().int().positive().optional(),
});

export const telegramLinkCodeResponseSchema = z.object({
  code: z.string().min(1).max(64),
  expiresIn: z.number().int().positive(),
});

export const telegramLinkCheckResponseSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('pending') }),
  z.object({ status: z.literal('linked'), login: z.string() }),
  z.object({ status: z.literal('expired') }),
  z.object({ status: z.literal('not_found') }),
]);

export const telegramQrLoginRequestResponseSchema = z.object({
  token: z.string().min(1),
  deepLink: z.string().url(),
  tgDeepLink: z.string().min(1),
  expiresIn: z.number().int().positive(),
});

export const telegramQrLoginCheckResponseSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('pending') }),
  z.object({
    status: z.literal('approved'),
    session: z.object({
      token: z.string(),
      refreshToken: z.string(),
      expiresIn: z.number().int().positive(),
      user: z.object({
        id: z.number().int().positive(),
        login: z.string(),
        name: z.string(),
        email: z.string(),
        isDev: z.boolean(),
        createdAt: z.string(),
      }),
    }),
  }),
  z.object({ status: z.literal('expired') }),
  z.object({ status: z.literal('not_found') }),
]);
