import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { authenticateUser, issueTokens, refreshAccessToken, registerUser } from '../services/auth.service';
import { fail, ok } from '../utils/response';
import { loginInput, refreshInput, registerInput } from '../validators/auth';
import { prisma } from '../utils/prisma';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const input = registerInput.parse(req.body);
    const user = await registerUser(input);
    return ok(res, { user, ...issueTokens(user) }, 'Registration successful', 201);
  } catch (error) {
    if (error instanceof ZodError) return fail(res, 'Invalid registration input', 'VALIDATION_ERROR', 422);
    return next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const input = loginInput.parse(req.body);
    const user = await authenticateUser(input.email, input.password);
    if (!user) return fail(res, 'Invalid email or password', 'AUTH_INVALID', 401);
    await prisma.activityLog.create({ data: { userId: user.id, action: 'USER_LOGIN', resource: 'User', resourceId: user.id, result: 'SUCCESS', ipAddress: req.ip } });
    return ok(res, { user, ...issueTokens(user) }, 'Login successful');
  } catch (error) {
    if (error instanceof ZodError) return fail(res, 'Invalid login input', 'VALIDATION_ERROR', 422);
    return next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.user) await prisma.activityLog.create({ data: { userId: req.user.id, action: 'USER_LOGOUT', resource: 'User', resourceId: req.user.id, result: 'SUCCESS', ipAddress: req.ip } });
    return ok(res, null, 'Logged out');
  } catch (error) {
    return next(error);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, email: true, name: true, role: true } });
    return user ? ok(res, user) : fail(res, 'User not found', 'AUTH_INVALID', 401);
  } catch (error) {
    return next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const input = refreshInput.parse(req.body);
    return ok(res, refreshAccessToken(input.refreshToken), 'Token refreshed');
  } catch (error) {
    if (error instanceof ZodError) return fail(res, 'Refresh token is required', 'VALIDATION_ERROR', 422);
    if (error instanceof Error && error.message === 'Invalid token') return fail(res, 'Invalid or expired refresh token', 'AUTH_INVALID', 401);
    return next(error);
  }
}
