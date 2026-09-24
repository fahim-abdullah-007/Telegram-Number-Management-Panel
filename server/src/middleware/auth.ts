import type { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { verifyAccessToken } from '../services/auth.service';
import { authenticateApiKey } from '../services/api-key.service';
import { isApiKey } from '../utils/api-key';
import { prisma } from '../utils/prisma';
import { fail } from '../utils/response';

export type AuthUser = { id: string; email: string; name: string; role: Role };

declare global {
  namespace Express {
    interface Request { user?: AuthUser; apiKey?: { id: string; keyPrefix: string; scopes: string[] } }
  }
}

export function auth(req: Request, res: Response, next: NextFunction) {
  const value = req.headers.authorization;
  const token = value?.startsWith('Bearer ') ? value.slice(7) : undefined;
  if (!token) return fail(res, 'Authentication required', 'AUTH_REQUIRED', 401);
  try {
    req.user = verifyAccessToken(token);
    return next();
  } catch {
    return fail(res, 'Invalid or expired token', 'AUTH_INVALID', 401);
  }
}

export const allow = (...roles: Role[]) => (req: Request, res: Response, next: NextFunction) => req.user && roles.includes(req.user.role) ? next() : fail(res, 'Insufficient permissions', 'FORBIDDEN', 403);

async function securityAudit(req: Request, action: string, resourceId?: string, result = 'FAILURE') {
  await prisma.activityLog.create({ data: { userId: req.user?.id, action, resource: 'ApiKey', resourceId, result, ipAddress: req.ip } });
}

export async function authAny(req: Request, res: Response, next: NextFunction) {
  const value = req.headers.authorization;
  const token = value?.startsWith('Bearer ') ? value.slice(7) : undefined;
  if (!token || !isApiKey(token)) return auth(req, res, next);
  try {
    const result = await authenticateApiKey(token);
    if (result.error) {
      await securityAudit(req, 'API_KEY_AUTH_FAILED', result.record?.id, result.error);
      const message = result.error === 'EXPIRED' ? 'API key expired' : result.error === 'REVOKED' ? 'API key revoked' : result.error === 'INACTIVE_USER' ? 'User account inactive' : 'Invalid API key';
      return fail(res, message, 'AUTH_INVALID', 401);
    }
    req.user = { id: result.record.user.id, email: result.record.user.email, name: result.record.user.name, role: result.record.user.role };
    req.apiKey = { id: result.record.id, keyPrefix: result.record.keyPrefix, scopes: result.record.scopes };
    return next();
  } catch {
    await securityAudit(req, 'API_KEY_AUTH_FAILED');
    return fail(res, 'Invalid API key', 'AUTH_INVALID', 401);
  }
}

const requestCounts = new Map<string, { startedAt: number; count: number }>();
const rateLimit = () => Math.max(1, Number(process.env.API_RATE_LIMIT ?? 100));
const rateWindow = () => Math.max(1000, Number(process.env.API_RATE_WINDOW_MS ?? 60000));

export function apiKeyRateLimit(req: Request, res: Response, next: NextFunction) {
  if (!req.apiKey) return next();
  const now = Date.now();
  const current = requestCounts.get(req.apiKey.id);
  const entry = !current || now - current.startedAt >= rateWindow() ? { startedAt: now, count: 1 } : { startedAt: current.startedAt, count: current.count + 1 };
  requestCounts.set(req.apiKey.id, entry);
  if (entry.count > rateLimit()) return fail(res, 'API key rate limit exceeded', 'RATE_LIMITED', 429);
  res.setHeader('X-RateLimit-Limit', String(rateLimit()));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, rateLimit() - entry.count)));
  return next();
}

export const requireScope = (scope: string) => async (req: Request, res: Response, next: NextFunction) => {
  if (!req.apiKey || req.apiKey.scopes.includes(scope)) return next();
  await securityAudit(req, 'API_KEY_PERMISSION_DENIED', req.apiKey.id, 'FAILURE');
  return fail(res, `API key requires ${scope} scope`, 'FORBIDDEN', 403);
};
