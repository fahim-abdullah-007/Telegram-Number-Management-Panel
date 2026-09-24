import bcrypt from 'bcryptjs';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { prisma } from '../utils/prisma';
import type { AuthUser } from '../middleware/auth';

const accessSecret = process.env.JWT_SECRET ?? 'development-only-change-me';
const refreshSecret = process.env.JWT_REFRESH_SECRET ?? accessSecret;
const accessExpiresIn = process.env.JWT_EXPIRES_IN ?? '8h';
const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN ?? '30d';

type TokenSubject = AuthUser & { type: 'access' | 'refresh' };

export function publicUser(user: { id: string; email: string; name: string; role: Role }): AuthUser {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function registerUser(input: { email: string; name: string; password: string }) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({ data: { email: input.email, name: input.name, passwordHash, role: Role.VIEWER }, select: { id: true, email: true, name: true, role: true } });
  return publicUser(user);
}

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null;
  return publicUser(user);
}

export function issueTokens(user: AuthUser) {
  const base = { id: user.id, email: user.email, name: user.name, role: user.role };
  return {
    token: jwt.sign({ ...base, type: 'access' }, accessSecret, { expiresIn: accessExpiresIn as jwt.SignOptions['expiresIn'] }),
    refreshToken: jwt.sign({ ...base, type: 'refresh' }, refreshSecret, { expiresIn: refreshExpiresIn as jwt.SignOptions['expiresIn'] }),
  };
}

function verifiedSubject(value: string, secret: string, type: TokenSubject['type']): AuthUser {
  const payload = jwt.verify(value, secret) as JwtPayload & Partial<TokenSubject>;
  if (payload.type !== type || typeof payload.id !== 'string' || typeof payload.email !== 'string' || typeof payload.name !== 'string' || !Object.values(Role).includes(payload.role as Role)) throw new Error('Invalid token');
  return { id: payload.id, email: payload.email, name: payload.name, role: payload.role as Role };
}

export function verifyAccessToken(token: string) {
  return verifiedSubject(token, accessSecret, 'access');
}

export function refreshAccessToken(refreshToken: string) {
  try {
    return issueTokens(verifiedSubject(refreshToken, refreshSecret, 'refresh'));
  } catch {
    throw new Error('Invalid token');
  }
}
