'use server';

import { revalidatePath } from 'next/cache';
import { requireSuperadminForAction, requireFuncionalidadeForAction } from '@/lib/authz';
import { ErroPromotora, lerPromotora } from '@/lib/promotoras/dominio';
import { gravarPromotora } from '@/lib/promotoras/servico';

export type ResultadoAction = { ok: true } | { ok: false; erro: string };

export async function salvarPromotora(formData: FormData): Promise<ResultadoAction> {
  try {
    const session = await requireSuperadminForAction();
    await requireFuncionalidadeForAction('hierarquia');
    const id = String(formData.get('id') ?? '').trim() || null;
    const dados = lerPromotora(formData);
    await gravarPromotora(id, dados, session.user.email ?? session.user.id, session.user);
    revalidatePath('/admin/hierarquia/promotoras');
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: erro instanceof ErroPromotora ? erro.message : 'Não foi possível salvar a promotora. Verifique seu acesso e tente novamente.' };
  }
}
