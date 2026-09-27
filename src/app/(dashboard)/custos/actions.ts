'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireSuperadminForAction } from '@/lib/authz';
import { registrarAuditoria } from '@/lib/auditoria';

const COMPETENCIA = /^\d{4}-(0[1-9]|1[0-2])$/;

function centavos(valor: FormDataEntryValue | null) {
  const normalizado = String(valor ?? '').trim().replace(/\./g, '').replace(',', '.');
  const numero = Number(normalizado);
  return Number.isFinite(numero) && numero > 0 ? Math.round(numero * 100) : null;
}

export async function cadastrarCusto(formData: FormData) {
  const session = await requireSuperadminForAction();
  const nome = String(formData.get('nome') ?? '').trim();
  const descricao = String(formData.get('descricao') ?? '').trim();
  const periodicidade = String(formData.get('periodicidade') ?? 'mensal') as 'unico' | 'mensal' | 'anual';
  const competencia = String(formData.get('competencia') ?? '');
  const valor = centavos(formData.get('valor'));
  const pago = formData.get('pago') === 'on';
  if (!nome || !valor || !COMPETENCIA.test(competencia) || !['unico', 'mensal', 'anual'].includes(periodicidade)) throw new Error('Preencha nome, valor, periodicidade e competência válidos.');
  const autor = session.user.email ?? session.user.id;
  await prisma.custo.create({ data: {
    nome, descricao: descricao || null, periodicidade, valorPadraoCentavos: valor, criadoPor: autor, atualizadoPor: autor,
    lancamentos: { create: { competencia, valorCentavos: valor, status: pago ? 'pago' : 'pendente', pagoEm: pago ? new Date() : null, criadoPor: autor, atualizadoPor: autor } },
  } });
  await registrarAuditoria(session.user, { acao: 'Custo cadastrado', rota: '/custos', detalhes: `${nome} · ${competencia}` });
  revalidatePath('/custos');
}

export async function alternarPagamento(id: string, status: 'pago' | 'pendente') {
  const session = await requireSuperadminForAction();
  await prisma.custoLancamento.update({ where: { id }, data: { status, pagoEm: status === 'pago' ? new Date() : null, atualizadoPor: session.user.email } });
  await registrarAuditoria(session.user, { acao: status === 'pago' ? 'Custo marcado como pago' : 'Custo marcado como pendente', rota: '/custos', detalhes: id });
  revalidatePath('/custos');
}

export async function gerarCompetencia(id: string, formData: FormData) {
  const session = await requireSuperadminForAction();
  const competencia = String(formData.get('competencia') ?? '');
  if (!COMPETENCIA.test(competencia)) throw new Error('Competência inválida.');
  const custo = await prisma.custo.findUnique({ where: { id } });
  if (!custo?.ativo || custo.periodicidade === 'unico') throw new Error('Este custo não aceita nova competência.');
  await prisma.custoLancamento.upsert({
    where: { custoId_competencia: { custoId: id, competencia } },
    create: { custoId: id, competencia, valorCentavos: custo.valorPadraoCentavos, criadoPor: session.user.email, atualizadoPor: session.user.email }, update: {},
  });
  revalidatePath('/custos');
}

export async function arquivarCusto(id: string) {
  const session = await requireSuperadminForAction();
  const custo = await prisma.custo.update({ where: { id }, data: { ativo: false, atualizadoPor: session.user.email } });
  await registrarAuditoria(session.user, { acao: 'Custo arquivado', rota: '/custos', detalhes: custo.nome });
  revalidatePath('/custos');
}
