// Sem isso, DATABASE_URL só existe quando algo mais no processo já carregou o
// .env antes (como o "next dev"/build) — rodar este script sozinho (`npm run
// seed`, ou o CMD do Dockerfile) quebrava com "Cannot read properties of
// undefined (reading 'replace')" dentro do adapter, porque a url chegava undefined.
// Em produção (sem .env, DATABASE_URL já vem do ambiente do container) isso é
// um no-op inofensivo.
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../src/generated/prisma/client';

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Lê de INITIAL_ADMIN_PASSWORD (env var configurada no EasyPanel, igual
// DATABASE_URL/NEXTAUTH_SECRET) em vez de sortear ou fixar no código — uma
// senha fixa no código ficaria gravada no histórico do git pra sempre, mesmo
// depois de trocada. Sem a env var, cai no sorteio aleatório de antes (só
// recuperável lendo o log do boot do container).
function generateTempPassword(): string {
  return process.env.INITIAL_ADMIN_PASSWORD || randomBytes(9).toString('base64url');
}

async function seedUsers() {
  // Idempotente: o seed roda a cada boot do container (scripts/boot.sh), então não recria
  // usuário (nem reseta senha), só cria na primeira vez que a tabela estiver vazia.
  if (await prisma.user.count() > 0) return;

  const ownerPassword = generateTempPassword();
  const curatorPassword = generateTempPassword();

  await prisma.user.create({
    data: {
      email: 'owner@tecksolucoes.com.br',
      passwordHash: bcrypt.hashSync(ownerPassword, 12),
      role: 'visualizador',
      displayName: 'Dono do Grupo',
      displayTitle: 'Dono do Grupo',
    },
  });

  await prisma.user.create({
    data: {
      email: 'patricio.pinto@tecksolucoes.com.br',
      passwordHash: bcrypt.hashSync(curatorPassword, 12),
      role: 'superadmin',
      displayName: 'Patrício Pinto',
      displayTitle: 'Head de Projetos',
    },
  });

  // Credenciais temporárias — só aparecem aqui, no console, na hora do seed.
  // Trocar a senha (ou recriar o usuário) antes de expor o app publicamente.
  console.log('\n=== Usuários iniciais criados (senha temporária, trocar depois) ===');
  console.log(`owner@tecksolucoes.com.br           / ${ownerPassword}`);
  console.log(`patricio.pinto@tecksolucoes.com.br  / ${curatorPassword}`);
  console.log('=====================================================================\n');
}

async function main() {
  await seedUsers();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
