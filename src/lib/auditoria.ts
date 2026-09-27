import 'server-only';
import { prisma } from '@/lib/prisma';

type IdentidadeAuditoria = {
  id: string;
  email?: string | null;
  displayName?: string | null;
  name?: string | null;
};

type EventoAuditoria = {
  acao: string;
  rota?: string | null;
  detalhes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export async function registrarAuditoria(usuario: IdentidadeAuditoria, evento: EventoAuditoria) {
  if (!usuario.id || !usuario.email) return;
  await prisma.auditoriaUsuario.create({
    data: {
      userId: usuario.id,
      userEmail: usuario.email,
      userName: usuario.displayName || usuario.name || usuario.email,
      acao: evento.acao.slice(0, 120),
      rota: evento.rota?.slice(0, 240) || null,
      detalhes: evento.detalhes?.slice(0, 1000) || null,
      latitude: evento.latitude ?? null,
      longitude: evento.longitude ?? null,
    },
  });
}
