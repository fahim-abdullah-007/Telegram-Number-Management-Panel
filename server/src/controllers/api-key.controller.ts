import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { API_KEY_SCOPES } from '../utils/api-key';
import { createUserApiKey, listUserApiKeys, revokeUserApiKey, rotateUserApiKey } from '../services/api-key.service';
import { apiKeyInput } from '../validators/api-key';
import { fail, ok } from '../utils/response';
import { prisma } from '../utils/prisma';

function expiresAt(value?: string | null) {
  return value ? new Date(value) : undefined;
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = apiKeyInput.parse(req.body);
    const created = await createUserApiKey(req.user!.id, { name: input.name, scopes: input.scopes, expiresAt: expiresAt(input.expiresAt) });
    await prisma.activityLog.create({ data: { userId: req.user!.id, action: 'API_KEY_CREATED', resource: 'ApiKey', resourceId: created.id, result: 'SUCCESS', ipAddress: req.ip } });
    return ok(res, created, 'API key created. Save this key securely because it will not be shown again.', 201);
  } catch (error) {
    if (error instanceof ZodError) return fail(res, 'Invalid API key input', 'VALIDATION_ERROR', 422);
    return next(error);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try { return ok(res, { items: await listUserApiKeys(req.user!.id), scopes: API_KEY_SCOPES }); } catch (error) { return next(error); }
}

export async function revoke(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await revokeUserApiKey(req.user!.id, String(req.params.id));
    if (!result.count) return fail(res, 'API key not found or already revoked', 'NOT_FOUND', 404);
    await prisma.activityLog.create({ data: { userId: req.user!.id, action: 'API_KEY_REVOKED', resource: 'ApiKey', resourceId: String(req.params.id), result: 'SUCCESS', ipAddress: req.ip } });
    return ok(res, null, 'API key revoked');
  } catch (error) { return next(error); }
}

export async function rotate(req: Request, res: Response, next: NextFunction) {
  try {
    const rotated = await rotateUserApiKey(req.user!.id, String(req.params.id));
    if (!rotated) return fail(res, 'API key not found or already revoked', 'NOT_FOUND', 404);
    await prisma.activityLog.create({ data: { userId: req.user!.id, action: 'API_KEY_ROTATED', resource: 'ApiKey', resourceId: String(req.params.id), result: 'SUCCESS', ipAddress: req.ip } });
    return ok(res, rotated, 'API key rotated. Save this key securely because it will not be shown again.');
  } catch (error) { return next(error); }
}
