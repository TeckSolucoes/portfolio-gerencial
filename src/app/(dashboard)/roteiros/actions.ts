'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireFuncionalidadeForAction, requireSuperadminForAction } from '@/lib/authz';
import { registrarAuditoria } from '@/lib/auditoria';

export type RoteiroFormState = { ok?: string; error?: string } | undefined;

function lerRegras(texto: string) {
  return texto.split(/\r?\n/).map((linha) => linha.trim()).filter(Boolean).map((linha) => {
    const separador = linha.indexOf(':');
    if (separador < 1) return null;
    const campo = linha.slice(0, separador).trim();
    const valor = linha.slice(separador + 1).trim();
    return campo && valor ? { campo, valor } : null;
  }).filter((regra): regra is { campo: string; valor: string } => Boolean(regra));
}

export async function salvarRoteiro(_estado: RoteiroFormState, formData: FormData): Promise<RoteiroFormState> {
  let session;
  try {
    session = await requireSuperadminForAction();
    await requireFuncionalidadeForAction('roteiros');
  } catch {
    return { error: 'Apenas superadministradores podem editar os roteiros.' };
  }

  const id = String(formData.get('id') ?? '').trim();
  const nome = String(formData.get('nome') ?? '').trim();
  const descricao = String(formData.get('descricao') ?? '').trim();
  const observacoes = String(formData.get('observacoes') ?? '').trim();
  const regras = lerRegras(String(formData.get('regras') ?? ''));
  if (nome.length < 2) return { error: 'Informe o nome do convênio.' };
  if (regras.length === 0) return { error: 'Inclua ao menos uma regra no formato Campo: valor.' };

  const autor = session.user.email ?? session.user.id;
  try {
    const roteiro = id
      ? await prisma.roteiroConvenio.update({ where: { id }, data: { nome, descricao: descricao || null, observacoes: observacoes || null, regrasJson: JSON.stringify(regras), atualizadoPor: autor } })
      : await prisma.roteiroConvenio.create({ data: { nome, descricao: descricao || null, observacoes: observacoes || null, regrasJson: JSON.stringify(regras), criadoPor: autor, atualizadoPor: autor } });
    await registrarAuditoria(session.user, { acao: id ? 'Roteiro de convênio atualizado' : 'Roteiro de convênio cadastrado', rota: '/roteiros', detalhes: roteiro.nome });
    revalidatePath('/roteiros');
    return { ok: `${roteiro.nome} salvo com sucesso.` };
  } catch (erro) {
    if (erro instanceof Error && erro.message.includes('Unique constraint')) return { error: 'Já existe um roteiro com esse nome.' };
    return { error: 'Não foi possível salvar o roteiro.' };
  }
}

export async function alternarRoteiro(id: string, ativo: boolean) {
  const session = await requireSuperadminForAction();
  await requireFuncionalidadeForAction('roteiros');
  const roteiro = await prisma.roteiroConvenio.update({ where: { id }, data: { ativo, atualizadoPor: session.user.email ?? session.user.id } });
  await registrarAuditoria(session.user, { acao: ativo ? 'Roteiro reativado' : 'Roteiro arquivado', rota: '/roteiros', detalhes: roteiro.nome });
  revalidatePath('/roteiros');
}
