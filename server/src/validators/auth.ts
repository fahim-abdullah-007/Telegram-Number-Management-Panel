import { z } from 'zod';

export const registerInput = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  name: z.string().trim().min(2).max(100),
  password: z.string().min(12).max(128),
});

export const loginInput = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

export const refreshInput = z.object({
  refreshToken: z.string().min(1),
});
