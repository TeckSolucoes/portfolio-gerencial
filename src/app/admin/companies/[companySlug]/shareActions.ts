'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireSuperadminForAction } from '@/lib/authz';

const SHARE_LINK_TTL_DAYS = 5;

function newExpiry(): Date {
  return new Date(Date.now() + SHARE_LINK_TTL_DAYS * 24 * 60 * 60 * 1000);
}

// Gerar sempre troca o token (revoga qualquer link já distribuído); renovar
// mantém o mesmo token e só empurra a validade — quem já tem o link continua
// com o mesmo link funcionando.
export async function generateCompanyShareLink(companySlug: string): Promise<void> {
  await requireSuperadminForAction();
  await prisma.company.update({
    where: { slug: companySlug },
    data: { shareToken: randomBytes(24).toString('base64url'), shareExpiresAt: newExpiry() },
  });
  revalidatePath(`/admin/companies/${companySlug}/fronts`);
}

export async function renewCompanyShareLink(companySlug: string): Promise<void> {
  await requireSuperadminForAction();
  await prisma.company.update({
    where: { slug: companySlug },
    data: { shareExpiresAt: newExpiry() },
  });
  revalidatePath(`/admin/companies/${companySlug}/fronts`);
}

export async function revokeCompanyShareLink(companySlug: string): Promise<void> {
  await requireSuperadminForAction();
  await prisma.company.update({
    where: { slug: companySlug },
    data: { shareToken: null, shareExpiresAt: null },
  });
  revalidatePath(`/admin/companies/${companySlug}/fronts`);
}
