import { ApiKeyStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { generateApiKey, hashApiKey, type ApiKeyScope } from '../utils/api-key';

export type ApiKeyMetadata = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  status: ApiKeyStatus;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
};

export function metadata(key: ApiKeyMetadata): ApiKeyMetadata {
  return key;
}

export async function createUserApiKey(userId: string, input: { name: string; scopes: ApiKeyScope[]; expiresAt?: Date }) {
  const generated = generateApiKey();
  const record = await prisma.apiKey.create({ data: { userId, name: input.name, scopes: input.scopes, keyPrefix: generated.keyPrefix, keyHash: generated.keyHash, expiresAt: input.expiresAt }, select: { id: true, name: true, keyPrefix: true, scopes: true, status: true, createdAt: true, updatedAt: true, lastUsedAt: true, expiresAt: true, revokedAt: true } });
  return { ...record, key: generated.key };
}

export function listUserApiKeys(userId: string) {
  return prisma.apiKey.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, keyPrefix: true, scopes: true, status: true, createdAt: true, updatedAt: true, lastUsedAt: true, expiresAt: true, revokedAt: true } });
}

export function revokeUserApiKey(userId: string, id: string) {
  return prisma.apiKey.updateMany({ where: { id, userId, status: ApiKeyStatus.ACTIVE }, data: { status: ApiKeyStatus.REVOKED, revokedAt: new Date() } });
}

export async function rotateUserApiKey(userId: string, id: string) {
  const current = await prisma.apiKey.findFirst({ where: { id, userId, status: ApiKeyStatus.ACTIVE }, select: { name: true, scopes: true, expiresAt: true } });
  if (!current) return null;
  const generated = generateApiKey();
  const result = await prisma.$transaction(async (transaction) => {
    await transaction.apiKey.update({ where: { id }, data: { status: ApiKeyStatus.REVOKED, revokedAt: new Date() } });
    return transaction.apiKey.create({ data: { userId, name: current.name, scopes: current.scopes, expiresAt: current.expiresAt, keyPrefix: generated.keyPrefix, keyHash: generated.keyHash }, select: { id: true, name: true, keyPrefix: true, scopes: true, status: true, createdAt: true, updatedAt: true, lastUsedAt: true, expiresAt: true, revokedAt: true } });
  });
  return { ...result, key: generated.key };
}

export async function authenticateApiKey(key: string) {
  const record = await prisma.apiKey.findUnique({ where: { keyHash: hashApiKey(key) }, include: { user: { select: { id: true, email: true, name: true, role: true, isActive: true } } } });
  if (!record) return { error: 'INVALID' as const };
  if (record.status === ApiKeyStatus.REVOKED) return { error: 'REVOKED' as const, record };
  if (record.expiresAt && record.expiresAt <= new Date()) {
    await prisma.apiKey.update({ where: { id: record.id }, data: { status: ApiKeyStatus.EXPIRED } });
    return { error: 'EXPIRED' as const, record };
  }
  if (!record.user.isActive) return { error: 'INACTIVE_USER' as const, record };
  await prisma.apiKey.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } });
  return { record };
}
