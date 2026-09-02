import 'server-only';
import type { Session } from 'next-auth';
import { auth } from '@/lib/auth';

// Checagem de autorização pra Server Actions (plan §4 + guia de auth do
// Next: "treat every action as an untrusted entry point" — o proxy.ts cobre
// navegação, mas cada action precisa se proteger de novo, porque pode ser
// chamada direto via POST sem passar pela UI que a esconde).
export async function requireSessionForAction(): Promise<Session> {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado.');
  return session;
}

export async function requireGerenteForAction(): Promise<Session> {
  const session = await requireSessionForAction();
  if (session.user.role === 'visualizador') throw new Error('Sem permissão para esta ação.');
  return session;
}

export async function requireSuperadminForAction(): Promise<Session> {
  const session = await requireSessionForAction();
  if (session.user.role !== 'superadmin') throw new Error('Ação restrita a superadmin.');
  return session;
}
