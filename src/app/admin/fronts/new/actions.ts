'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireGerenteForAction } from '@/lib/authz';
import { slugify } from '@/lib/slug';
import { sanitizeSummaryHtml } from '@/lib/sanitize';
import type { FrontStatus, ItemStatus } from '@/generated/prisma/enums';

export type CreateFrontWithItemsState = { error?: string } | undefined;

type ItemInput = { title: string; status: ItemStatus; note: string };

export async function createFrontWithItems(
  _prevState: CreateFrontWithItemsState,
  formData: FormData,
): Promise<CreateFrontWithItemsState> {
  try {
    await requireGerenteForAction();
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Sem permissão.' };
  }

  const companySlug = String(formData.get('companySlug') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const summaryRaw = String(formData.get('summary') ?? '');
  const ownerName = String(formData.get('ownerName') ?? '').trim();
  const ownerInitials = String(formData.get('ownerInitials') ?? '')
    .trim()
    .toUpperCase();
  const requesterNameRaw = String(formData.get('requesterName') ?? '').trim();
  const nextMilestone = String(formData.get('nextMilestone') ?? '').trim();
  const nextDateRaw = String(formData.get('nextDate') ?? '');
  const statusManualRaw = String(formData.get('statusManual') ?? '');
  const progressManualRaw = String(formData.get('progressManual') ?? '');
  const prioritized = formData.get('prioritized') === 'on';
  const itemsJsonRaw = String(formData.get('itemsJson') ?? '[]');

  if (!companySlug) return { error: 'Selecione uma empresa.' };
  if (!title || !ownerName || !ownerInitials) {
    return { error: 'Preencha título, responsável e iniciais.' };
  }

  let progressManual: number | null = null;
  if (progressManualRaw) {
    progressManual = Number(progressManualRaw);
    if (Number.isNaN(progressManual) || progressManual < 0 || progressManual > 100) {
      return { error: 'Progresso inicial deve ser um número entre 0 e 100.' };
    }
  }

  let items: ItemInput[];
  try {
    items = JSON.parse(itemsJsonRaw) as ItemInput[];
  } catch {
    return { error: 'Lista de atividades inválida.' };
  }

  for (const item of items) {
    if (!item.title?.trim()) return { error: 'Toda atividade precisa de um título.' };
    if (item.status === 'blocked' && !item.note?.trim()) {
      return { error: 'Atividades bloqueadas precisam de uma observação explicando o motivo.' };
    }
  }

  const company = await prisma.company.findUnique({ where: { slug: companySlug } });
  if (!company) return { error: 'Empresa não encontrada.' };

  const baseSlug = slugify(title);
  if (!baseSlug) return { error: 'Título inválido para gerar um identificador de URL.' };

  let slug = baseSlug;
  let suffix = 2;
  while (
    await prisma.front.findUnique({ where: { companyId_slug: { companyId: company.id, slug } } })
  ) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const sortOrder = await prisma.front.count({ where: { companyId: company.id } });

  await prisma.$transaction(async (tx) => {
    const front = await tx.front.create({
      data: {
        companyId: company.id,
        slug,
        title,
        summaryHtml: sanitizeSummaryHtml(summaryRaw),
        ownerName,
        ownerInitials,
        requesterName: requesterNameRaw || 'A definir',
        nextMilestone: nextMilestone || null,
        nextDate: nextDateRaw ? new Date(nextDateRaw) : null,
        statusManual: statusManualRaw ? (statusManualRaw as FrontStatus) : null,
        progressManual,
        prioritized,
        sortOrder,
        epicKeys: JSON.stringify([]),
      },
    });

    if (items.length > 0) {
      await tx.frontItem.createMany({
        data: items.map((item, index) => ({
          frontId: front.id,
          jiraIssueKey: null,
          titleOverride: item.title.trim(),
          statusOverride: item.status,
          note: item.note?.trim() || null,
          sortOrder: index,
        })),
      });
    }
  });

  redirect(`/admin/companies/${companySlug}/fronts/${slug}`);
}
