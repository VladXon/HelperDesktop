import { z } from 'zod';

export const opSchema = z.object({
  login: z.string().min(3).max(64).regex(/^[a-zA-Z0-9_-]+$/),
});

export const commandSchema = z.object({
  command: z.string().min(1).max(256),
});
