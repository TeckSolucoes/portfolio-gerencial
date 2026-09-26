'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireSuperadminForAction } from '@/lib/authz';
import { EMPRESAS, gravarEmpresas } from '@/lib/empresas';
import type { Role } from '@/generated/prisma/enums';

const ROLES: readonly Role[] = ['visualizador', 'gerente', 'superadmin'];

type Acesso = { role: Role; empresas: string; escopoGerente: string | null };

function lerAcesso(formData: FormData): Acesso | { error: string } {
  const role = String(formData.get('role') ?? 'visualizador') as Role;
  if (!ROLES.includes(role)) return { error: 'Papel inválido.' };

  const pedidas = formData.getAll('empresas').map((v) => String(v).trim().toUpperCase());
  if (pedidas.some((e) => !(EMPRESAS as readonly string[]).includes(e))) {
    return { error: 'Empresa inválida.' };
  }

  // Superadmin vê tudo e não tem turma: guardar valores aqui só confundiria a lista depois.
  if (role === 'superadmin') return { role, empresas: gravarEmpresas(EMPRESAS), escopoGerente: null };

  const escopo = String(formData.get('escopoGerente') ?? '').trim();
  if (escopo.length > 60) return { error: 'Nome do gerente muito longo.' };
  return { role, empresas: gravarEmpresas(pedidas), escopoGerente: escopo || null };
}


// Mesmo cost factor do prisma/seed.ts (12), pra manter consistência entre os
// usuários seedados e os criados por aqui.
const BCRYPT_COST = 12;

async function ehUltimoSuperadmin(id: string): Promise<boolean> {
  const alvo = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (alvo?.role !== 'superadmin') return false;
  return (await prisma.user.count({ where: { role: 'superadmin', id: { not: id } } })) === 0;
}

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
  const acesso = lerAcesso(formData);
  if ('error' in acesso) return acesso;

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
      ...acesso,
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
  const acesso = lerAcesso(formData);
  if ('error' in acesso) return acesso;
  const newPassword = String(formData.get('newPassword') ?? '');

  if (!displayName) {
    return { error: 'Preencha o nome de exibição.' };
  }
  if (newPassword && newPassword.length < 8) {
    return { error: 'A nova senha precisa ter pelo menos 8 caracteres.' };
  }

  if (acesso.role !== 'superadmin' && (await ehUltimoSuperadmin(id))) {
    return { error: 'Este é o único superadmin: promova outro usuário antes de rebaixar este.' };
  }

  await prisma.user.update({
    where: { id },
    data: {
      displayName,
      displayTitle: displayTitle || null,
      ...acesso,
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

  if (await ehUltimoSuperadmin(id)) {
    throw new Error('Não é possível remover o único superadmin.');
  }

  await prisma.user.delete({ where: { id } });
  revalidatePath('/admin/settings/users');
}
