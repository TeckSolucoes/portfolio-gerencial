'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireSuperadminForAction } from '@/lib/authz';
import { EMPRESAS, gravarEmpresas } from '@/lib/empresas';
import type { Role } from '@/generated/prisma/enums';
import { registrarAuditoria } from '@/lib/auditoria';
import { CHAVES_FUNCIONALIDADES, ehFuncionalidade } from '@/lib/funcionalidades';
import type { Funcionalidade } from '@/lib/funcionalidades';

const ROLES: readonly Role[] = ['visualizador', 'gerente', 'superadmin'];

type Acesso = { role: Role; empresas: string; escopoGerente: string | null };

function lerPermissoes(formData: FormData): { funcionalidade: Funcionalidade; permitido: boolean }[] | { error: string } {
  const resultado: { funcionalidade: Funcionalidade; permitido: boolean }[] = [];
  for (const chave of CHAVES_FUNCIONALIDADES) {
    const valor = String(formData.get(`permissao_${chave}`) ?? 'herdar');
    if (valor === 'herdar') continue;
    if (!['liberar', 'bloquear'].includes(valor) || !ehFuncionalidade(chave)) return { error: 'Permissão inválida.' };
    resultado.push({ funcionalidade: chave, permitido: valor === 'liberar' });
  }
  return resultado;
}

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
  let session;
  try {
    session = await requireSuperadminForAction();
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Sem permissão.' };
  }

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const displayName = String(formData.get('displayName') ?? '').trim();
  const displayTitle = String(formData.get('displayTitle') ?? '').trim();
  const acesso = lerAcesso(formData);
  if ('error' in acesso) return acesso;
  const permissoes = lerPermissoes(formData);
  if ('error' in permissoes) return permissoes;

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

  const criado = await prisma.user.create({
    data: {
      email,
      passwordHash: bcrypt.hashSync(password, BCRYPT_COST),
      displayName,
      displayTitle: displayTitle || null,
      ...acesso,
      permissoes: { create: permissoes },
    },
  });
  await registrarAuditoria(session.user, {
    acao: 'Usuário criado',
    rota: '/admin/settings/users',
    detalhes: `${criado.email} · perfil ${criado.role}`,
  });

  revalidatePath('/admin/settings/users');
  return undefined;
}

export async function updateUser(
  id: string,
  _prevState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  let session;
  try {
    session = await requireSuperadminForAction();
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Sem permissão.' };
  }

  const displayName = String(formData.get('displayName') ?? '').trim();
  const displayTitle = String(formData.get('displayTitle') ?? '').trim();
  const acesso = lerAcesso(formData);
  if ('error' in acesso) return acesso;
  const permissoes = lerPermissoes(formData);
  if ('error' in permissoes) return permissoes;
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

  const atualizado = await prisma.$transaction(async (tx) => {
    await tx.permissaoUsuario.deleteMany({ where: { userId: id } });
    return tx.user.update({ where: { id }, data: {
      displayName, displayTitle: displayTitle || null, ...acesso,
      ...(newPassword ? { passwordHash: bcrypt.hashSync(newPassword, BCRYPT_COST) } : {}),
      permissoes: { create: permissoes },
    } });
  });
  await registrarAuditoria(session.user, {
    acao: newPassword ? 'Usuário e senha atualizados' : 'Usuário atualizado',
    rota: '/admin/settings/users',
    detalhes: `${atualizado.email} · perfil ${atualizado.role}`,
  });

  revalidatePath('/admin/settings/users');
  return undefined;
}

export async function salvarPermissoesPerfil(formData: FormData) {
  const session = await requireSuperadminForAction();
  const role = String(formData.get('role') ?? '') as Role;
  if (!ROLES.includes(role)) throw new Error('Perfil inválido.');
  const regras = CHAVES_FUNCIONALIDADES.map((funcionalidade) => ({
    role, funcionalidade, permitido: formData.getAll('funcionalidades').some((v) => v === funcionalidade),
  }));
  await prisma.$transaction(regras.map((regra) => prisma.permissaoPerfil.upsert({
    where: { role_funcionalidade: { role, funcionalidade: regra.funcionalidade } }, create: regra, update: { permitido: regra.permitido },
  })));
  await registrarAuditoria(session.user, { acao: 'Permissões do perfil atualizadas', rota: '/admin/settings/users', detalhes: role });
  revalidatePath('/', 'layout');
}

export async function deleteUser(id: string): Promise<void> {
  const session = await requireSuperadminForAction();
  if (session.user.id === id) {
    throw new Error('Você não pode remover o próprio usuário.');
  }

  if (await ehUltimoSuperadmin(id)) {
    throw new Error('Não é possível remover o único superadmin.');
  }

  const removido = await prisma.user.delete({ where: { id } });
  await registrarAuditoria(session.user, {
    acao: 'Usuário excluído',
    rota: '/admin/settings/users',
    detalhes: `${removido.email} · perfil ${removido.role}`,
  });
  revalidatePath('/admin/settings/users');
}
