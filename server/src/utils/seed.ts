import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';
const prisma = new PrismaClient();
const args = Object.fromEntries(process.argv.slice(2).reduce<string[][]>((all, item, index, values) => item.startsWith('--') ? [...all, [item.slice(2), values[index + 1] ?? '']] : all, []));
const email = args.email ?? 'admin@example.com';
const password = args.password;
async function main() {
	if (!password || password.length < 12) throw new Error('Provide --password with at least 12 characters');
	const passwordHash = await bcrypt.hash(password, 12);
	await prisma.user.upsert({ where: { email }, update: { name: 'Saymon', passwordHash, role: Role.ADMIN }, create: { email, name: 'Saymon', passwordHash, role: Role.ADMIN } });
	await prisma.$disconnect();
	console.log(`Admin ${email} created or updated.`);
}
main().catch(async (error) => { await prisma.$disconnect(); console.error(error); process.exit(1); });