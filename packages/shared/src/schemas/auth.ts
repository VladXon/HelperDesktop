import { z } from 'zod';

export const LOGIN_REGEX = /^[a-zA-Z0-9_-]+$/;

export const loginSchema = z
  .string()
  .min(3)
  .max(64)
  .regex(LOGIN_REGEX, 'login may only contain letters, digits, underscore and dash');

export const passwordSchema = z.string().min(1).max(256);

export const registerSchema = z.object({
  login: loginSchema,
  password: passwordSchema,
  name: z.string().min(0).max(128).optional(),
});

export const loginBodySchema = z.object({
  login: loginSchema,
  password: passwordSchema,
});

export const passwordPolicySchema = z
  .string()
  .min(8)
  .max(256)
  .refine((v) => /[A-Z]/.test(v), 'must contain uppercase letter')
  .refine((v) => /[a-z]/.test(v), 'must contain lowercase letter')
  .refine((v) => /[0-9]/.test(v), 'must contain a digit');

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const changeEmailSchema = z.object({
  email: z.string().max(256),
  currentPassword: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: passwordSchema,
  newPassword: passwordPolicySchema,
});
