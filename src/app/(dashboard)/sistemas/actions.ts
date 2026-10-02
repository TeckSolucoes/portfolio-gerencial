'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireFuncionalidadeForAction, requireSuperadminForAction } from '@/lib/authz';
import { registrarAuditoria } from '@/lib/auditoria';
import { lerSistema } from '@/lib/sistemas';

type Resultado = { ok: true } | { ok: false; erro: string };

// Sem id = cadastro novo; com id = edição.
export async function salvarSistema(formData: FormData): Promise<Resultado> {
  try {
    const session = await requireSuperadminForAction();
    await requireFuncionalidadeForAction('sistemas');
    const lido = lerSistema(formData);
    if (!lido.ok) return { ok: false, erro: lido.erro };
    const id = String(formData.get('id') ?? '').trim();
    const autor = session.user.displayName || session.user.email || 'admin';
    const dados = { ...lido.dados, atualizadoPor: autor };
    if (id) await prisma.sistema.update({ where: { id }, data: dados });
    else await prisma.sistema.create({ data: dados });
    await registrarAuditoria(session.user, { acao: id ? 'Sistema editado' : 'Sistema cadastrado', rota: '/sistemas', detalhes: lido.dados.nome });
    revalidatePath('/sistemas');
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Não foi possível salvar.' };
  }
}

export async function removerSistema(id: string): Promise<Resultado> {
  try {
    const session = await requireSuperadminForAction();
    await requireFuncionalidadeForAction('sistemas');
    const removido = await prisma.sistema.delete({ where: { id } });
    await registrarAuditoria(session.user, { acao: 'Sistema removido', rota: '/sistemas', detalhes: removido.nome });
    revalidatePath('/sistemas');
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Não foi possível remover.' };
  }
}
