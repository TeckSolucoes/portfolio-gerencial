'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireSuperadminForAction } from '@/lib/authz';
import { EMPRESAS, type Empresa } from '@/lib/empresas';
import { mesValido, parseValorBR } from '@/lib/dinheiro';

export type MetasFormState = { error?: string; ok?: string } | undefined;

function revalidar() {
  revalidatePath('/relatorio');
  revalidatePath('/admin/metas');
}

export async function salvarMetas(_prev: MetasFormState, formData: FormData): Promise<MetasFormState> {
  let session;
  try {
    session = await requireSuperadminForAction();
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Sem permissão.' };
  }

  const mes = String(formData.get('mes') ?? '');
  if (!mesValido(mes)) return { error: 'Mês inválido.' };
  const autor = session.user.displayName || session.user.name || session.user.email || 'admin';

  const limpar = String(formData.get('limpar') ?? '');
  if (limpar) {
    if (!(EMPRESAS as readonly string[]).includes(limpar)) return { error: 'Empresa inválida.' };
    await prisma.metaMensal.deleteMany({ where: { empresa: limpar, mes } });
    revalidar();
    return { ok: `Meta de ${limpar} removida.` };
  }

  // Campo em branco = não mexer nessa empresa; mas precisa haver ao menos um valor.
  const novas: { empresa: Empresa; valor: number }[] = [];
  for (const empresa of EMPRESAS) {
    const bruto = String(formData.get(`valor_${empresa}`) ?? '').trim();
    if (!bruto) continue;
    const r = parseValorBR(bruto);
    if (!r.ok) return { error: `${empresa}: ${r.erro}` };
    novas.push({ empresa, valor: r.valor });
  }
  if (novas.length === 0) return { error: 'Informe a meta de pelo menos uma empresa.' };

  await prisma.$transaction(
    novas.map(({ empresa, valor }) =>
      prisma.metaMensal.upsert({
        where: { empresa_mes: { empresa, mes } },
        create: { empresa, mes, valor, atualizadoPor: autor },
        update: { valor, atualizadoPor: autor },
      }),
    ),
  );
  revalidar();
  return { ok: 'Metas salvas.' };
}
