'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireSuperadminForAction } from '@/lib/authz';
import type { Role } from '@/generated/prisma/enums';

// Mesmo cost factor do prisma/seed.ts (12), pra manter consistência entre os
// usuários seedados e os criados por aqui.
const BCRYPT_COST = 12;

export type UserFormState = { error?: string } | undefined;

export async function createUser(_prevState: UserFormState, formData: FormData): Promise<UserFormState> {
  try {
    await requireSuperadminForAction();
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Sem permissão.' };
  }

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const displayName = String(formData.get('displayName') ?? '').trim();
  const displayTitle = String(formData.get('displayTitle') ?? '').trim();
  const role = String(formData.get('role') ?? 'visualizador') as Role;

  if (!email || !password || !displayName) {
    return { error: 'Preencha e-mail, senha e nome de exibição.' };
  }
  if (password.length < 8) {
    return { error: 'A senha precisa ter pelo menos 8 caracteres.' };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: 'Já existe um usuário com esse e-mail.' };
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash: bcrypt.hashSync(password, BCRYPT_COST),
      displayName,
      displayTitle: displayTitle || null,
      role,
    },
  });

  revalidatePath('/admin/settings/users');
  return undefined;
}

export async function updateUser(
  id: string,
  _prevState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  try {
    await requireSuperadminForAction();
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Sem permissão.' };
  }

  const displayName = String(formData.get('displayName') ?? '').trim();
  const displayTitle = String(formData.get('displayTitle') ?? '').trim();
  const role = String(formData.get('role') ?? 'visualizador') as Role;
  const newPassword = String(formData.get('newPassword') ?? '');

  if (!displayName) {
    return { error: 'Preencha o nome de exibição.' };
  }
  if (newPassword && newPassword.length < 8) {
    return { error: 'A nova senha precisa ter pelo menos 8 caracteres.' };
  }

  await prisma.user.update({
    where: { id },
    data: {
      displayName,
      displayTitle: displayTitle || null,
      role,
      ...(newPassword ? { passwordHash: bcrypt.hashSync(newPassword, BCRYPT_COST) } : {}),
    },
  });

  revalidatePath('/admin/settings/users');
  return undefined;
}

export async function deleteUser(id: string): Promise<void> {
  const session = await requireSuperadminForAction();
  if (session.user.id === id) {
    throw new Error('Você não pode remover o próprio usuário.');
  }

  await prisma.user.delete({ where: { id } });
  revalidatePath('/admin/settings/users');
}
