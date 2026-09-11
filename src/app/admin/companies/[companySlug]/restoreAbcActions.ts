'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireSuperadminForAction } from '@/lib/authz';
import { ABC_RESTORED_FRONTS } from './restoreAbcData';

function parseNextDate(ddmm: string | null): Date | null {
  if (!ddmm) return null;
  const [day, month] = ddmm.split('/').map(Number);
  return new Date(Date.UTC(2026, month - 1, day, 12, 0, 0));
}

// Ação de recuperação única (2026-09) — reconstrói as 21 frentes da ABC Card
// a partir do texto que o usuário copiou da tela pública, depois da perda de
// dado causada por falta de volume persistente no EasyPanel. Ver comentário
// em restoreAbcData.ts sobre a limitação (itens individuais não recuperáveis,
// só a contagem). REMOVER este arquivo e o botão assim que confirmado.
export async function restoreAbcCardFronts(companySlug: string): Promise<void> {
  await requireSuperadminForAction();

  const company = await prisma.company.findUnique({ where: { slug: companySlug } });
  if (!company) throw new Error('Empresa não encontrada.');

  await prisma.$transaction(async (tx) => {
    await tx.front.updateMany({
      where: { companyId: company.id, archivedAt: null },
      data: { archivedAt: new Date() },
    });

    for (let i = 0; i < ABC_RESTORED_FRONTS.length; i++) {
      const f = ABC_RESTORED_FRONTS[i];
      await tx.front.create({
        data: {
          companyId: company.id,
          slug: f.slug,
          title: f.title,
          summaryHtml: '',
          statusMode: 'manual',
          statusManual: f.status,
          progressMode: 'manual',
          progressManual: f.progress,
          ownerName: f.ownerName,
          ownerInitials: f.ownerInitials,
          nextMilestone: f.nextMilestone,
          nextDate: parseNextDate(f.nextDate),
          prioritized: f.prioritized,
          sortOrder: i,
        },
      });
    }
  });

  revalidatePath(`/admin/companies/${companySlug}/fronts`);
  revalidatePath(`/${companySlug}`);
  revalidatePath('/');
}
