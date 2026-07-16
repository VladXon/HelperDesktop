import { z } from 'zod';

export const settingValueSchema = z.unknown();

export const settingSetSchema = z.object({
  value: settingValueSchema,
});

export const settingBatchSchema = z.object({
  data: z.record(z.string().min(1).max(128), settingValueSchema),
});
