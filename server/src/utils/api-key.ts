import { createHash, randomBytes } from 'node:crypto';

export const API_KEY_SCOPES = ['numbers:read', 'numbers:write', 'telegram:read', 'telegram:write', 'dashboard:read', 'activity:read'] as const;
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

const prefix = process.env.API_KEY_PREFIX ?? 'sk_live_';

export function generateApiKey() {
  const key = `${prefix}${randomBytes(32).toString('base64url')}`;
  return { key, keyPrefix: key.slice(0, prefix.length + 8), keyHash: hashApiKey(key) };
}

export function hashApiKey(key: string) {
  return createHash('sha256').update(key, 'utf8').digest('hex');
}

export function isApiKey(value: string) {
  return value.startsWith(prefix);
}

export function validScopes(scopes: string[]): scopes is ApiKeyScope[] {
  return scopes.every((scope) => (API_KEY_SCOPES as readonly string[]).includes(scope));
}
