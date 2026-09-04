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
import { DATA } from '../src/lib/mockData';

// Carrega no SQLite local o mesmo conteúdo hoje hardcoded em src/lib/mockData.ts —
// mesmas 3 empresas, mesmas 18 frentes, mesmos itens, cópia idêntica (inclusive
// o HTML de <strong> em summary). Ver relatório da tarefa para as escolhas de
// mapeamento de data (updatedAt do item / nextDate da frente).

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Âncora de "hoje" usada para calcular os timestamps reais a partir das strings
// relativas do mock ("hoje", "ontem", "há N dias") e das datas "DD/MM" de
// nextDate. Fixa (não `new Date()`) porque a cópia aprovada foi calibrada para
// essa data — rodar o seed num dia diferente não deve mudar o que "ontem"
// significa para este conteúdo.
const TODAY = new Date('2026-09-01T12:00:00Z');

function daysAgo(n: number): Date {
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

/** Converte a string `updated` do mock ("hoje" | "ontem" | "há N dias" | "—") num timestamp real. */
function parseUpdated(updated: string): Date {
  if (updated === 'hoje') return daysAgo(0);
  if (updated === 'ontem') return daysAgo(1);
  const match = updated.match(/^há (\d+) dias?$/);
  if (match) return daysAgo(Number(match[1]));
  // '—': item nunca tocado (normalmente status "todo") — não há sinal de data,
  // usa o instante do seed como fallback neutro.
  return TODAY;
}

/** Converte "DD/MM" (ano implícito = ano da âncora TODAY) em Date. */
function parseNextDate(ddmm: string): Date {
  const [day, month] = ddmm.split('/').map(Number);
  return new Date(Date.UTC(TODAY.getUTCFullYear(), month - 1, day, 12, 0, 0));
}

// Lê de INITIAL_ADMIN_PASSWORD (env var configurada no EasyPanel, igual
// DATABASE_URL/NEXTAUTH_SECRET) em vez de sortear ou fixar no código — uma
// senha fixa no código ficaria gravada no histórico do git pra sempre, mesmo
// depois de trocada. Sem a env var, cai no sorteio aleatório de antes (só
// recuperável lendo o log do boot do container).
function generateTempPassword(): string {
  return process.env.INITIAL_ADMIN_PASSWORD || randomBytes(9).toString('base64url');
}

const STATUS_MAPPING: Array<{ jiraStatusName: string; mappedStatus: 'todo' | 'doing' | 'done' | 'blocked' }> = [
  { jiraStatusName: 'A Fazer', mappedStatus: 'todo' },
  { jiraStatusName: 'To Do', mappedStatus: 'todo' },
  { jiraStatusName: 'Em Andamento', mappedStatus: 'doing' },
  { jiraStatusName: 'In Progress', mappedStatus: 'doing' },
  { jiraStatusName: 'Concluído', mappedStatus: 'done' },
  { jiraStatusName: 'Done', mappedStatus: 'done' },
  { jiraStatusName: 'Bloqueado', mappedStatus: 'blocked' },
  { jiraStatusName: 'Blocked', mappedStatus: 'blocked' },
];

async function seedCompaniesAndFronts() {
  // Idempotente: seed roda automaticamente a cada boot do container (ver CMD do
  // Dockerfile), então precisa ser seguro repetir sem duplicar dado nem quebrar
  // em unique constraint.
  if (await prisma.company.count() > 0) return;

  const companies = Object.values(DATA);

  for (let companyIndex = 0; companyIndex < companies.length; companyIndex++) {
    const company = companies[companyIndex];

    const companyRow = await prisma.company.create({
      data: {
        slug: company.slug,
        name: company.name,
        tag: company.tag,
        tone: company.tone,
        tagline: company.tagline,
        sortOrder: companyIndex,
      },
    });

    for (let frontIndex = 0; frontIndex < company.fronts.length; frontIndex++) {
      const front = company.fronts[frontIndex];

      const frontRow = await prisma.front.create({
        data: {
          companyId: companyRow.id,
          slug: front.id,
          title: front.title,
          summaryHtml: front.summary,
          statusMode: 'manual',
          statusManual: front.status,
          progressMode: 'manual',
          progressManual: front.progress,
          ownerName: front.owner,
          ownerInitials: front.ownerInit,
          nextMilestone: front.nextMilestone,
          nextDate: parseNextDate(front.nextDate),
          prioritized: front.prioritized,
          epicKeys: JSON.stringify([]),
          sortOrder: frontIndex,
        },
      });

      for (let itemIndex = 0; itemIndex < front.items.length; itemIndex++) {
        const item = front.items[itemIndex];

        await prisma.frontItem.create({
          data: {
            frontId: frontRow.id,
            jiraIssueKey: null,
            titleOverride: item.title,
            statusOverride: item.status,
            note: item.note ?? null,
            hidden: false,
            sortOrder: itemIndex,
            updatedAt: parseUpdated(item.updated),
          },
        });
      }
    }
  }
}

async function seedStatusMapping() {
  for (const mapping of STATUS_MAPPING) {
    await prisma.jiraStatusMapping.upsert({
      where: { jiraStatusName: mapping.jiraStatusName },
      update: { mappedStatus: mapping.mappedStatus },
      create: mapping,
    });
  }
}

async function seedUsers() {
  // Idempotente pelo mesmo motivo de seedCompaniesAndFronts — não recriar
  // usuário (nem resetar senha) em todo boot, só na primeira vez que a tabela
  // estiver vazia.
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
  await seedCompaniesAndFronts();
  await seedStatusMapping();
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
