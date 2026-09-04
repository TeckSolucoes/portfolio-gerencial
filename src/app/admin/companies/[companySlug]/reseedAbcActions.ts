'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireSuperadminForAction } from '@/lib/authz';
import { ABC_ENTREGAS_FRONTS, deriveFrontStatus, deriveProgress } from './reseedAbcData';

// Ação de migração única: substitui as frentes da ABC Card pelo conteúdo real
// de Entregas.md (pedido do usuário em 2026-09-02). Dados/regras de derivação
// ficam em reseedAbcData.ts (sem 'use server'), testável sem sessão HTTP.
export async function reseedAbcCardFromEntregas(companySlug: string): Promise<void> {
  await requireSuperadminForAction();

  const company = await prisma.company.findUnique({ where: { slug: companySlug } });
  if (!company) throw new Error('Empresa não encontrada.');

  await prisma.$transaction(async (tx) => {
    // Soft-delete das frentes atuais (mesma convenção de arquivamento usada
    // no resto do app) em vez de apagar — histórico fica preservado no banco.
    await tx.front.updateMany({
      where: { companyId: company.id, archivedAt: null },
      data: { archivedAt: new Date() },
    });

    for (let i = 0; i < ABC_ENTREGAS_FRONTS.length; i++) {
      const f = ABC_ENTREGAS_FRONTS[i];
      await tx.front.create({
        data: {
          companyId: company.id,
          slug: f.slug,
          title: f.title,
          summaryHtml: f.summary,
          statusMode: 'manual',
          statusManual: deriveFrontStatus(f.items),
          progressMode: 'manual',
          progressManual: deriveProgress(f.items),
          ownerName: 'A definir',
          ownerInitials: 'AD',
          prioritized: false,
          sortOrder: i,
          items: {
            create: f.items.map((item, j) => ({
              titleOverride: item.title,
              statusOverride: item.status,
              note: item.note ?? null,
              sortOrder: j,
            })),
          },
        },
      });
    }
  });

  revalidatePath(`/admin/companies/${companySlug}/fronts`);
  revalidatePath(`/${companySlug}`);
  revalidatePath('/');
}
