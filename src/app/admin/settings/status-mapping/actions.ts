'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireSuperadminForAction } from '@/lib/authz';
import type { ItemStatus } from '@/generated/prisma/enums';

export type MappingFormState = { error?: string } | undefined;

export async function createMapping(_prevState: MappingFormState, formData: FormData): Promise<MappingFormState> {
  try {
    await requireSuperadminForAction();
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Sem permissão.' };
  }

  const jiraStatusName = String(formData.get('jiraStatusName') ?? '').trim();
  const mappedStatus = String(formData.get('mappedStatus') ?? '') as ItemStatus;

  if (!jiraStatusName || !mappedStatus) {
    return { error: 'Preencha o nome do status no Jira e o status mapeado.' };
  }

  const existing = await prisma.jiraStatusMapping.findUnique({ where: { jiraStatusName } });
  if (existing) {
    return { error: 'Já existe um mapeamento para esse status do Jira.' };
  }

  await prisma.jiraStatusMapping.create({ data: { jiraStatusName, mappedStatus } });
  revalidatePath('/admin/settings/status-mapping');
  return undefined;
}

export async function updateMapping(
  id: string,
  _prevState: MappingFormState,
  formData: FormData,
): Promise<MappingFormState> {
  try {
    await requireSuperadminForAction();
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Sem permissão.' };
  }

  const mappedStatus = String(formData.get('mappedStatus') ?? '') as ItemStatus;
  if (!mappedStatus) return { error: 'Selecione um status mapeado.' };

  await prisma.jiraStatusMapping.update({ where: { id }, data: { mappedStatus } });
  revalidatePath('/admin/settings/status-mapping');
  return undefined;
}

export async function deleteMapping(id: string): Promise<void> {
  await requireSuperadminForAction();
  await prisma.jiraStatusMapping.delete({ where: { id } });
  revalidatePath('/admin/settings/status-mapping');
}
