import 'server-only';
import { prisma } from '@/lib/prisma';
import type { Sala } from './dominio';
export async function listarSalas(): Promise<Sala[]> {
  const agora = new Date();
  const vigencia = { inicio: { lte: agora }, OR: [{ fim: null }, { fim: { gt: agora } }] };
  const equipes = await prisma.equipeComercial.findMany({
    where: { ativo: true }, orderBy: [{ empresa: 'asc' }, { nome: 'asc' }],
    include: {
      vinculosGerente: { where: { ...vigencia, gerente: { ativo: true } }, include: { gerente: true } },
      vinculosVendedor: { where: { ...vigencia, vendedor: { ativo: true } }, include: { vendedor: true } },
    },
  });
  return [{ id: 'recepcao', nome: 'Recepção', empresa: 'Grupo', pessoas: [] }, ...equipes.map(equipe => ({
    id: equipe.id, nome: equipe.nome, empresa: equipe.empresa,
    pessoas: [...new Set([...equipe.vinculosGerente.map(v => `${v.gerente.nome} · Gerente`), ...equipe.vinculosVendedor.map(v => v.vendedor.nome)])],
  }))];
}
