import { z } from 'zod';

export const noteCreateSchema = z.object({
  title: z.string().max(200).default(''),
  body: z.string().max(10000).default(''),
  tags: z.array(z.string().min(1).max(64)).max(10).default([]),
  reminderAt: z.number().int().nullable().default(null),
  notifyTelegram: z.boolean().default(false),
});

export const noteUpdateSchema = z.object({
  title: z.string().max(200).optional(),
  body: z.string().max(10000).optional(),
  tags: z.array(z.string().min(1).max(64)).max(10).optional(),
  reminderAt: z.number().int().nullable().optional(),
  notifyTelegram: z.boolean().optional(),
  pinned: z.boolean().optional(),
  completed: z.boolean().optional(),
});

export const noteToggleSchema = z.object({
  field: z.enum(['pinned', 'completed']),
});
