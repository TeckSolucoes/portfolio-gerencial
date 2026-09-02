'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireGerenteForAction } from '@/lib/authz';
import type { ItemStatus } from '@/generated/prisma/enums';

export type ItemFormState = { error?: string } | undefined;

async function findFront(companySlug: string, frontSlug: string) {
  const company = await prisma.company.findUnique({ where: { slug: companySlug } });
  if (!company) return null;
  return prisma.front.findUnique({ where: { companyId_slug: { companyId: company.id, slug: frontSlug } } });
}

export async function createItem(
  companySlug: string,
  frontSlug: string,
  _prevState: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  try {
    await requireGerenteForAction();
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Sem permissão.' };
  }

  const front = await findFront(companySlug, frontSlug);
  if (!front) return { error: 'Frente não encontrada.' };

  const titleOverride = String(formData.get('titleOverride') ?? '').trim();
  const statusOverride = String(formData.get('statusOverride') ?? 'todo') as ItemStatus;
  const note = String(formData.get('note') ?? '').trim();

  if (!titleOverride) {
    return { error: 'Preencha o título do item.' };
  }

  const sortOrder = await prisma.frontItem.count({ where: { frontId: front.id } });

  await prisma.frontItem.create({
    data: {
      frontId: front.id,
      jiraIssueKey: null,
      titleOverride,
      statusOverride,
      note: note || null,
      sortOrder,
    },
  });

  revalidatePath(`/admin/companies/${companySlug}/fronts/${frontSlug}/items`);
  revalidatePath(`/${companySlug}/${frontSlug}`);
  return undefined;
}

export async function updateItem(
  companySlug: string,
  frontSlug: string,
  itemId: string,
  _prevState: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  try {
    await requireGerenteForAction();
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Sem permissão.' };
  }

  const front = await findFront(companySlug, frontSlug);
  if (!front) return { error: 'Frente não encontrada.' };

  const item = await prisma.frontItem.findUnique({ where: { id: itemId } });
  if (!item || item.frontId !== front.id) return { error: 'Item não encontrado.' };

  const titleOverride = String(formData.get('titleOverride') ?? '').trim();
  const statusOverride = String(formData.get('statusOverride') ?? 'todo') as ItemStatus;
  const note = String(formData.get('note') ?? '').trim();
  const hidden = formData.get('hidden') === 'on';

  if (!titleOverride) {
    return { error: 'Preencha o título do item.' };
  }
  if (statusOverride === 'blocked' && !note) {
    return { error: 'Itens bloqueados precisam de uma observação explicando o motivo.' };
  }

  await prisma.frontItem.update({
    where: { id: itemId },
    data: { titleOverride, statusOverride, note: note || null, hidden },
  });

  revalidatePath(`/admin/companies/${companySlug}/fronts/${frontSlug}/items`);
  revalidatePath(`/${companySlug}/${frontSlug}`);
  return undefined;
}

export async function deleteItem(companySlug: string, frontSlug: string, itemId: string): Promise<void> {
  await requireGerenteForAction();

  const front = await findFront(companySlug, frontSlug);
  if (!front) throw new Error('Frente não encontrada.');

  const item = await prisma.frontItem.findUnique({ where: { id: itemId } });
  if (!item || item.frontId !== front.id) throw new Error('Item não encontrado.');

  await prisma.frontItem.delete({ where: { id: itemId } });

  revalidatePath(`/admin/companies/${companySlug}/fronts/${frontSlug}/items`);
  revalidatePath(`/${companySlug}/${frontSlug}`);
}
