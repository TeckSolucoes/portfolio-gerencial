'use server';
import { requireFuncionalidadeForAction } from '@/lib/authz';
import { prisma } from '@/lib/prisma';
import { autorizarEscritorio, TTL_PRESENCA, validarMensagem, validarSessao, type EstadoEscritorio } from '@/lib/escritorio/dominio';
async function acessoEscritorio(sala: string) {
  const acesso = await requireFuncionalidadeForAction('hierarquia');
  autorizarEscritorio(acesso.perfil, acesso.funcionalidades.hierarquia);
  if (typeof sala !== 'string' || sala.length > 64) throw new Error('Sala inválida.');
  if (sala !== 'recepcao' && !await prisma.equipeComercial.findFirst({ where: { id: sala, ativo: true }, select: { id: true } })) throw new Error('Esta sala não está disponível.');
  return acesso;
}
export async function atualizarEscritorio(sala: string, sessao: string): Promise<EstadoEscritorio> {
  const acesso = await acessoEscritorio(sala);
  const id = `${acesso.userId}:${validarSessao(sessao)}`;
  const agora = new Date();
  const limite = new Date(agora.getTime() - TTL_PRESENCA);
  await prisma.escritorioPresenca.deleteMany({ where: { vistoEm: { lte: limite } } });
  await prisma.escritorioPresenca.upsert({ where: { id }, create: { id, userId: acesso.userId, nome: acesso.nome, sala, vistoEm: agora }, update: { nome: acesso.nome, sala, vistoEm: agora } });
  const [presencas, mensagens] = await Promise.all([
    prisma.escritorioPresenca.findMany({ where: { vistoEm: { gt: limite } }, select: { userId: true, nome: true, sala: true }, orderBy: { vistoEm: 'desc' } }),
    prisma.escritorioMensagem.findMany({ where: { sala }, take: 60, orderBy: { criadoEm: 'desc' }, select: { id: true, nome: true, texto: true, criadoEm: true } }),
  ]);
  return { presencas: [...new Map(presencas.map(p => [`${p.userId}:${p.sala}`, p])).values()], mensagens: mensagens.reverse().map(m => ({ ...m, criadoEm: m.criadoEm.toISOString() })) };
}
export async function enviarMensagem(sala: string, texto: string) {
  const acesso = await acessoEscritorio(sala);
  await prisma.escritorioMensagem.create({ data: { sala, userId: acesso.userId, nome: acesso.nome, texto: validarMensagem(texto) } });
}
