import 'server-only';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { montarAcesso } from './permissoes';
import type { Acesso } from './permissoes';

// Lê as permissões do banco a cada request (não do token): o que o ADM muda vale na hora,
// e usuário apagado perde o acesso mesmo com a sessão ainda aberta.
export async function carregarAcesso(): Promise<Acesso | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const u = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, role: true, displayName: true, empresas: true, escopoGerente: true,
      permissoes: { select: { funcionalidade: true, permitido: true } },
    },
  });
  if (!u) return null;
  const perfil = await prisma.permissaoPerfil.findMany({
    where: { role: u.role },
    select: { funcionalidade: true, permitido: true },
  });
  return montarAcesso({ ...u, permissoesPerfil: perfil, permissoesUsuario: u.permissoes });
}
