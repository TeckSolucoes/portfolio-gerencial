import 'server-only';
import { cache } from 'react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { montarAcesso } from './permissoes';
import type { Acesso } from './permissoes';

// Lê as permissões do banco a cada request (não do token): o que o ADM muda vale na hora,
// e usuário apagado perde o acesso mesmo com a sessão ainda aberta.
// cache() do React dedupe por request: Header e a página chamam isso de forma independente
// e, sem isso, cada navegação fazia a consulta duas vezes (2 idas ao banco cada) em série.
export const carregarAcesso = cache(async (): Promise<Acesso | null> => {
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
});
