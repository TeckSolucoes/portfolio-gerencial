import { prisma } from './prisma';
import type { Company as CompanyRow } from '@/generated/prisma/client';

// Usado pelas duas páginas públicas (/share/[token] e /share/[token]/[frontSlug])
// — token expirado é tratado igual a token inexistente (não distingue erro pro
// visitante, evita vazar se um link já existiu).
export async function resolveShareCompany(token: string): Promise<CompanyRow | null> {
  const company = await prisma.company.findUnique({ where: { shareToken: token } });
  if (!company || !company.shareExpiresAt || company.shareExpiresAt.getTime() < Date.now()) {
    return null;
  }
  return company;
}
