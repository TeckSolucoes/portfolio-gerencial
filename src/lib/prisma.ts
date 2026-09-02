import { PrismaClient } from '@/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

// Prisma 7 removeu a leitura implícita de DATABASE_URL pelo client — o adapter
// de driver (@prisma/adapter-better-sqlite3) é obrigatório para conexão direta
// (não-Accelerate). Ver prisma/schema.prisma para o motivo de o datasource não
// ter mais `url`. DATABASE_URL segue o formato "file:./data/arquivo.db".
const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// WAL é uma propriedade persistida no arquivo .db (não por conexão) — setar
// aqui garante que um arquivo novo (primeiro deploy, ambiente recriado) fique
// no mesmo modo usado em produção pelo projeto irmão Capacity, sem exigir um
// passo manual separado. Reexecutar em runs seguintes é inofensivo (no-op).
prisma.$executeRawUnsafe('PRAGMA journal_mode = WAL').catch(() => {});
