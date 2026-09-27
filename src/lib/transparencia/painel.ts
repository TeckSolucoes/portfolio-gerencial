import 'server-only';
import { prisma } from '../prisma';
import { efetivado, importarBase } from './baseClientes';
import type { ImportacaoBase } from './baseClientes';
import { indicadorDaLista } from './clientesNovos';
import type { IndicadorLista } from './clientesNovos';

// Leituras e gravações que a tela /transparencia usa. Tudo aqui é só para superadmin: quem chama
// (página e rotas) confere o perfil antes.

export const ORIGENS = { front: 'Front', funcao: 'Função' } as const;
export type Origem = keyof typeof ORIGENS;
export const origemValida = (v: unknown): v is Origem => typeof v === 'string' && v in ORIGENS;

const LOTE = 500;
const PREVIA = 100;

export async function mesesProcessados() {
  return prisma.portalMes.findMany({ orderBy: { mes: 'desc' } });
}

export async function detalheDoMes(mes: string) {
  const [recemNomeados, porOrgao, previa] = await Promise.all([
    prisma.portalNovo.count({ where: { mes, tipo: 'recem-nomeado' } }),
    prisma.portalNovo.groupBy({ by: ['orgaoSuperior'], where: { mes }, _count: { _all: true }, orderBy: { _count: { orgaoSuperior: 'desc' } }, take: 10 }),
    prisma.portalNovo.findMany({ where: { mes }, orderBy: [{ tipo: 'desc' }, { orgao: 'asc' }, { nome: 'asc' }], take: PREVIA }),
  ]);
  return {
    recemNomeados,
    porOrgao: porOrgao.map((o) => ({ chave: o.orgaoSuperior || '(não informado)', qtd: o._count._all })),
    previa,
  };
}

export async function linhasDoMes(mes: string) {
  return prisma.portalNovo.findMany({ where: { mes }, orderBy: [{ tipo: 'desc' }, { orgao: 'asc' }, { nome: 'asc' }] });
}

// Uma linha por lista mensal: dos acionáveis daquele mês, quem fechou contrato depois.
export async function indicadores(): Promise<IndicadorLista[]> {
  const meses = await prisma.portalMes.findMany({ orderBy: { mes: 'desc' }, take: 12, select: { mes: true } });
  if (meses.length === 0) return [];
  const [novos, contratos] = await Promise.all([
    prisma.portalNovo.findMany({ where: { mes: { in: meses.map((m) => m.mes) } }, select: { mes: true, chave: true } }),
    prisma.baseCliente.findMany({ where: { data: { not: '' } }, select: { chave: true, data: true, valor: true, status: true } }),
  ]);
  const fechados = contratos.filter((c) => efetivado(c.status));
  return meses.map(({ mes }) =>
    indicadorDaLista(
      mes,
      novos.filter((n) => n.mes === mes).map((n) => n.chave),
      fechados,
    ),
  );
}

export async function importacoes() {
  return prisma.baseImportacao.findMany();
}

// Troca TODAS as linhas daquela origem pelas do arquivo novo (o export é sempre a base completa).
export async function gravarBase(origem: Origem, arquivo: string, texto: string, usuario: string | null): Promise<ImportacaoBase> {
  const r = importarBase(texto);
  if (r.linhas.length === 0) throw new Error('Nenhuma linha com CPF e nome válidos no arquivo.');
  await prisma.$transaction(
    async (tx) => {
      await tx.baseCliente.deleteMany({ where: { origem } });
      for (let i = 0; i < r.linhas.length; i += LOTE) {
        await tx.baseCliente.createMany({ data: r.linhas.slice(i, i + LOTE).map((l) => ({ origem, ...l })) });
      }
      const dados = { arquivo: arquivo.slice(0, 200), linhas: r.linhas.length, ignoradas: r.ignoradas, importadoPor: usuario, importadoEm: new Date() };
      await tx.baseImportacao.upsert({ where: { origem }, create: { origem, ...dados }, update: dados });
    },
    { timeout: 120_000 },
  );
  return r;
}
