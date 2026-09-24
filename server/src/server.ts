import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import { Role, NumberStatus, AccountStatus } from '@prisma/client';
import { z, ZodError } from 'zod';
import { parse as parseCsv } from 'csv-parse/sync';
import authRoutes from './routes/auth.routes';
import apiKeyRoutes from './routes/api-key.routes';
import { auth, allow, authAny, apiKeyRateLimit, requireScope } from './middleware/auth';
import { prisma } from './utils/prisma';
import { fail, ok } from './utils/response';

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });
const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.text({ type: 'text/csv', limit: '2mb' }));
app.use(express.json({ limit: '1mb' }));
app.use((req, _res, next) => { logger.info({ method: req.method, path: req.path }, 'request'); next(); });
async function audit(req: Request, action: string, resource: string, resourceId: string | undefined, result = 'SUCCESS') {
  if (req.user) await prisma.activityLog.create({ data: { userId: req.user.id, action, resource, resourceId, result, ipAddress: req.ip } });
}
const numberInput = z.object({ country: z.string().min(2).max(80), countryCode: z.string().regex(/^\+?[0-9]{1,5}$/), phoneNumber: z.string().min(5).max(32), provider: z.string().min(1).max(100), status: z.nativeEnum(NumberStatus).optional(), notes: z.string().max(500).optional() });

app.get('/', (_req, res) => ok(res, { service: 'telegram-number-management-api', health: '/health' }, 'API is running'));
app.get('/health', (_req, res) => ok(res, { api: 'operational', timestamp: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/api-keys', apiKeyRoutes);

app.get('/api/numbers', authAny, apiKeyRateLimit, requireScope('numbers:read'), async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1)); const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 10)));
    const search = String(req.query.search ?? ''); const status = req.query.status as NumberStatus | undefined; const country = req.query.country ? String(req.query.country) : undefined;
    const where = { ...(search ? { OR: [{ phoneNumber: { contains: search, mode: 'insensitive' as const } }, { provider: { contains: search, mode: 'insensitive' as const } }] } : {}), ...(status ? { status } : {}), ...(country ? { country } : {}) };
    const [items, total] = await Promise.all([prisma.number.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, include: { account: { select: { id: true, username: true, status: true } } } }), prisma.number.count({ where })]);
    return ok(res, { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});
app.post('/api/numbers', authAny, apiKeyRateLimit, requireScope('numbers:write'), allow(Role.ADMIN, Role.OPERATOR), async (req, res, next) => { try { const data = numberInput.parse(req.body); const item = await prisma.number.create({ data }); await audit(req, 'NUMBER_ADDED', 'Number', item.id); return ok(res, item, 'Number added'); } catch (e) { next(e); } });
app.get('/api/numbers/:id', authAny, apiKeyRateLimit, requireScope('numbers:read'), async (req, res, next) => { try { const id = String(req.params.id); const item = await prisma.number.findUnique({ where: { id }, include: { account: { include: { sessions: true } } } }); return item ? ok(res, item) : fail(res, 'Number not found', 'NOT_FOUND', 404); } catch (e) { next(e); } });
app.put('/api/numbers/:id', authAny, apiKeyRateLimit, requireScope('numbers:write'), allow(Role.ADMIN, Role.OPERATOR), async (req, res, next) => { try { const id = String(req.params.id); const data = numberInput.partial().parse(req.body); const item = await prisma.number.update({ where: { id }, data }); await audit(req, 'NUMBER_EDITED', 'Number', item.id); return ok(res, item, 'Number updated'); } catch (e) { next(e); } });
app.delete('/api/numbers/:id', authAny, apiKeyRateLimit, requireScope('numbers:write'), allow(Role.ADMIN, Role.OPERATOR), async (req, res, next) => { try { const id = String(req.params.id); await prisma.number.delete({ where: { id } }); await audit(req, 'NUMBER_DELETED', 'Number', id); return ok(res, null, 'Number deleted'); } catch (e) { next(e); } });
app.post('/api/numbers/import', authAny, apiKeyRateLimit, requireScope('numbers:write'), allow(Role.ADMIN, Role.OPERATOR), async (req, res, next) => { try { const parsedRows = typeof req.body === 'string' ? parseCsv(req.body, { columns: true, skip_empty_lines: true, trim: true }) : req.body.rows; const rows = z.array(numberInput).max(1000).parse(parsedRows); let successful = 0, duplicate = 0; const errors: unknown[] = []; for (const row of rows) { try { await prisma.number.create({ data: row }); successful++; } catch (e: any) { if (e.code === 'P2002') duplicate++; else errors.push({ row, message: 'Insert failed' }); } } await audit(req, 'NUMBERS_IMPORTED', 'Number', undefined); return ok(res, { total: rows.length, successful, duplicate, invalid: 0, failed: errors.length, errors }); } catch (e) { if (e instanceof ZodError) return fail(res, 'Invalid import rows', 'VALIDATION_ERROR'); next(e); } });

app.get('/api/accounts', authAny, apiKeyRateLimit, requireScope('telegram:read'), async (req, res, next) => { try { const page = Math.max(1, Number(req.query.page ?? 1)); const limit = 10; const status = req.query.status as AccountStatus | undefined; const where = status ? { status } : {}; const [items, total] = await Promise.all([prisma.telegramAccount.findMany({ where, include: { number: true, sessions: true }, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * limit, take: limit }), prisma.telegramAccount.count({ where })]); return ok(res, { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }); } catch (e) { next(e); } });
app.get('/api/accounts/:id', authAny, apiKeyRateLimit, requireScope('telegram:read'), async (req, res, next) => { try { const id = String(req.params.id); const item = await prisma.telegramAccount.findUnique({ where: { id }, include: { number: true, sessions: true } }); return item ? ok(res, item) : fail(res, 'Account not found', 'NOT_FOUND', 404); } catch (e) { next(e); } });
app.post('/api/accounts/:id/disconnect', authAny, apiKeyRateLimit, requireScope('telegram:write'), allow(Role.ADMIN, Role.OPERATOR), async (req, res, next) => { try { const id = String(req.params.id); const item = await prisma.telegramAccount.update({ where: { id }, data: { status: 'DISCONNECTED', sessions: { updateMany: { where: { status: 'ACTIVE' }, data: { status: 'REVOKED' } } }, number: { update: { telegramLinked: false } } } }); await audit(req, 'ACCOUNT_DISCONNECTED', 'TelegramAccount', item.id); return ok(res, item, 'Account disconnected'); } catch (e) { next(e); } });
app.delete('/api/accounts/:id', authAny, apiKeyRateLimit, requireScope('telegram:write'), allow(Role.ADMIN), async (req, res, next) => { try { const id = String(req.params.id); await prisma.telegramAccount.delete({ where: { id } }); await audit(req, 'ACCOUNT_DELETED', 'TelegramAccount', id); return ok(res, null, 'Local account record deleted'); } catch (e) { next(e); } });

app.get('/api/logs', authAny, apiKeyRateLimit, requireScope('activity:read'), async (req, res, next) => { try { const page = Math.max(1, Number(req.query.page ?? 1)); const limit = 20; const [items, total] = await Promise.all([prisma.activityLog.findMany({ include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }), prisma.activityLog.count()]); return ok(res, { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }); } catch (e) { next(e); } });
app.get('/api/dashboard/stats', authAny, apiKeyRateLimit, requireScope('dashboard:read'), async (_req, res, next) => { try { const [total, active, linked, blocked, logs, sessions] = await Promise.all([prisma.number.count(), prisma.number.count({ where: { status: 'ACTIVE' } }), prisma.number.count({ where: { telegramLinked: true } }), prisma.number.count({ where: { status: 'BLOCKED' } }), prisma.activityLog.findMany({ orderBy: { createdAt: 'desc' }, take: 6, include: { user: { select: { name: true } } } }), prisma.session.findMany({ orderBy: { updatedAt: 'desc' }, take: 5, include: { account: { select: { username: true } } } })]); return ok(res, { totals: { total, active, inactive: total - active, linked, unlinked: total - linked, blocked }, recentActivity: logs, recentSessions: sessions, system: { api: 'Operational', database: 'Connected' } }); } catch (e) { next(e); } });

app.get('/api/telegram/status', authAny, apiKeyRateLimit, requireScope('telegram:read'), (_req, res) => ok(res, { configured: Boolean(process.env.TELEGRAM_API_ID && process.env.TELEGRAM_API_HASH), connection: 'DISCONNECTED', lastSynchronization: null }));
app.post('/api/telegram/connect', authAny, apiKeyRateLimit, requireScope('telegram:write'), allow(Role.ADMIN), async (req, res) => { await audit(req, 'CONFIGURATION_CHANGED', 'Telegram', undefined); return ok(res, { connection: 'CONNECTED' }, 'Telegram integration marked connected'); });
app.post('/api/telegram/disconnect', authAny, apiKeyRateLimit, requireScope('telegram:write'), allow(Role.ADMIN), async (req, res) => { await audit(req, 'CONFIGURATION_CHANGED', 'Telegram', undefined); return ok(res, { connection: 'DISCONNECTED' }, 'Telegram integration disconnected'); });

app.use((_req, res) => fail(res, 'Route not found', 'NOT_FOUND', 404));
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => { logger.error(error); if (error instanceof ZodError) return fail(res, 'Input validation failed', 'VALIDATION_ERROR'); if ((error as { code?: string }).code === 'P2002') return fail(res, 'A record with that value already exists', 'DUPLICATE'); if ((error as { code?: string }).code === 'P2025') return fail(res, 'Record not found', 'NOT_FOUND', 404); return fail(res, 'Something went wrong', 'INTERNAL_ERROR', 500); });

app.listen(port, () => logger.info({ port }, 'API listening'));
export { app };