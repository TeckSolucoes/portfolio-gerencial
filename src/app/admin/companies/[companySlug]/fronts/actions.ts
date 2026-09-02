'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireGerenteForAction } from '@/lib/authz';

export async function toggleFrontPriority(companySlug: string, frontId: string): Promise<void> {
  await requireGerenteForAction();

  const front = await prisma.front.findUnique({ where: { id: frontId } });
  if (!front) throw new Error('Frente não encontrada.');

  const updated = await prisma.front.update({
    where: { id: frontId },
    data: { prioritized: !front.prioritized },
  });

  revalidatePath(`/admin/companies/${companySlug}/fronts`);
  revalidatePath(`/admin/companies/${companySlug}/fronts/${updated.slug}`);
  revalidatePath(`/${companySlug}`);
  revalidatePath(`/${companySlug}/${updated.slug}`);
}
