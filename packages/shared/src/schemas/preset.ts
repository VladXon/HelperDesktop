import { z } from 'zod';

export const presetAppSchema = z.object({
  name: z.string().min(1).max(128),
  path: z.string().min(1).max(1024),
  runAsAdmin: z.boolean().default(false),
});

export const presetCreateSchema = z.object({
  name: z.string().min(1).max(128),
  icon: z.string().max(32).default(''),
  apps: z.array(presetAppSchema).max(32).default([]),
});

export const presetUpdateSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  icon: z.string().max(32).optional(),
  apps: z.array(presetAppSchema).max(32).optional(),
  pinned: z.boolean().optional(),
});
