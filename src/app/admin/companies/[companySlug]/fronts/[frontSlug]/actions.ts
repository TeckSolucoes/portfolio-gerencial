'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireGerenteForAction, requireSuperadminForAction } from '@/lib/authz';
import { sanitizeSummaryHtml } from '@/lib/sanitize';
import type { DerivationMode, FrontStatus } from '@/generated/prisma/enums';

export type FrontFormState = { error?: string; success?: string } | undefined;

async function findFront(companySlug: string, frontSlug: string) {
  const company = await prisma.company.findUnique({ where: { slug: companySlug } });
  if (!company) return null;
  const front = await prisma.front.findUnique({
    where: { companyId_slug: { companyId: company.id, slug: frontSlug } },
  });
  if (!front) return null;
  return { company, front };
}

export async function updateFront(
  companySlug: string,
  frontSlug: string,
  _prevState: FrontFormState,
  formData: FormData,
): Promise<FrontFormState> {
  try {
    await requireGerenteForAction();
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Sem permissão.' };
  }

  const found = await findFront(companySlug, frontSlug);
  if (!found) return { error: 'Frente não encontrada.' };

  const title = String(formData.get('title') ?? '').trim();
  const summaryRaw = String(formData.get('summary') ?? '');
  const ownerName = String(formData.get('ownerName') ?? '').trim();
  const ownerInitials = String(formData.get('ownerInitials') ?? '')
    .trim()
    .toUpperCase();
  const nextMilestone = String(formData.get('nextMilestone') ?? '').trim();
  const nextDateRaw = String(formData.get('nextDate') ?? '');
  const statusMode = String(formData.get('statusMode') ?? 'manual') as DerivationMode;
  const statusManualRaw = String(formData.get('statusManual') ?? '');
  const progressMode = String(formData.get('progressMode') ?? 'manual') as DerivationMode;
  const progressManualRaw = String(formData.get('progressManual') ?? '');
  const prioritized = formData.get('prioritized') === 'on';

  if (!title || !ownerName || !ownerInitials) {
    return { error: 'Preencha título, responsável e iniciais.' };
  }

  let progressManual: number | null = null;
  if (progressManualRaw) {
    progressManual = Number(progressManualRaw);
    if (Number.isNaN(progressManual) || progressManual < 0 || progressManual > 100) {
      return { error: 'Progresso manual deve ser um número entre 0 e 100.' };
    }
  }

  await prisma.front.update({
    where: { id: found.front.id },
    data: {
      title,
      summaryHtml: sanitizeSummaryHtml(summaryRaw),
      ownerName,
      ownerInitials,
      nextMilestone: nextMilestone || null,
      nextDate: nextDateRaw ? new Date(nextDateRaw) : null,
      statusMode,
      statusManual: statusManualRaw ? (statusManualRaw as FrontStatus) : null,
      progressMode,
      progressManual,
      prioritized,
    },
  });

  revalidatePath(`/admin/companies/${companySlug}/fronts`);
  revalidatePath(`/admin/companies/${companySlug}/fronts/${frontSlug}`);
  revalidatePath(`/${companySlug}`);
  revalidatePath(`/${companySlug}/${frontSlug}`);

  return { success: 'Frente atualizada.' };
}

export async function archiveFront(companySlug: string, frontSlug: string): Promise<void> {
  await requireSuperadminForAction();

  const found = await findFront(companySlug, frontSlug);
  if (!found) throw new Error('Frente não encontrada.');

  await prisma.front.update({ where: { id: found.front.id }, data: { archivedAt: new Date() } });
  revalidatePath(`/admin/companies/${companySlug}/fronts`);
  revalidatePath(`/${companySlug}`);
  redirect(`/admin/companies/${companySlug}/fronts`);
}

export async function unarchiveFront(companySlug: string, frontSlug: string): Promise<void> {
  await requireSuperadminForAction();

  const found = await findFront(companySlug, frontSlug);
  if (!found) throw new Error('Frente não encontrada.');

  await prisma.front.update({ where: { id: found.front.id }, data: { archivedAt: null } });
  revalidatePath(`/admin/companies/${companySlug}/fronts/${frontSlug}`);
  revalidatePath(`/${companySlug}`);
}
