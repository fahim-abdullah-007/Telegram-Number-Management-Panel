import { z } from 'zod';
import { API_KEY_SCOPES } from '../utils/api-key';

export const apiKeyScope = z.enum(API_KEY_SCOPES);
export const apiKeyInput = z.object({
  name: z.string().trim().min(1).max(100),
  scopes: z.array(apiKeyScope).min(1).max(API_KEY_SCOPES.length),
  expiresAt: z.string().datetime({ offset: true }).optional().nullable(),
});
