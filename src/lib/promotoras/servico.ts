import 'server-only';
import { prisma } from '@/lib/prisma';
import { ErroPromotora, resumirAlteracoes, type CadastroPromotora } from './dominio';
import { fotoExiste } from './fotos';

export async function listarPromotoras() {
  const [promotoras, gerentes] = await Promise.all([
    prisma.promotora.findMany({ orderBy: [{ empresa: 'asc' }, { nome: 'asc' }], include: { gerente: true, historico: { orderBy: { createdAt: 'desc' } } } }),
    prisma.gerenteComercial.findMany({ orderBy: [{ empresa: 'asc' }, { nome: 'asc' }], select: { id: true, nome: true, empresa: true, ativo: true } }),
  ]);
  const [fotoCeo, gerentesComFoto, promotorasComFoto] = await Promise.all([
    fotoExiste('ceo-roberto'),
    Promise.all(gerentes.map(async gerente => ({ ...gerente, foto: await fotoExiste(`gerente-${gerente.id}`) }))),
    Promise.all(promotoras.map(async p => ({ id: p.id, empresa: p.empresa, nome: p.nome, cnpj: p.cnpj, codigo: p.codigo, origem: p.origem, ativo: p.ativo, gerenteId: p.gerenteComercialId, gerenteNome: p.gerente?.nome ?? null, foto: await fotoExiste(`promotora-${p.id}`), atualizadoEm: p.updatedAt.toISOString(), historico: p.historico.map(h => ({ id: h.id, data: h.createdAt.toISOString(), resumo: `${h.resumo} · ${h.autor}` })) }))),
  ]);
  return { fotoCeo, gerentes: gerentesComFoto, promotoras: promotorasComFoto };
}

export async function gravarPromotora(id: string | null, dados: CadastroPromotora, autor: string, usuario?: { id: string; email?: string | null; name?: string | null; displayName?: string | null }) {
  return prisma.$transaction(async tx => {
    const anterior = id ? await tx.promotora.findUnique({ where: { id } }) : null;
    if (id && !anterior) throw new ErroPromotora('A promotora não foi encontrada.');
    if (dados.codigo) {
      const duplicada = await tx.promotora.findFirst({ where: { empresa: dados.empresa, origem: dados.origem, codigo: dados.codigo, ...(id ? { id: { not: id } } : {}) } });
      if (duplicada) throw new ErroPromotora('Já existe uma promotora com esse código nesta empresa e origem.');
    }
    if (dados.gerenteComercialId) {
      const gerente = await tx.gerenteComercial.findUnique({ where: { id: dados.gerenteComercialId } });
      if (!gerente || gerente.empresa !== dados.empresa) throw new ErroPromotora('Selecione um gerente da mesma empresa.');
      if (!gerente.ativo && anterior?.gerenteComercialId !== gerente.id) throw new ErroPromotora('Selecione um gerente ativo.');
    }
    const snapshot = anterior ? { empresa: anterior.empresa, nome: anterior.nome, cnpj: anterior.cnpj, codigo: anterior.codigo, origem: anterior.origem, ativo: anterior.ativo, gerenteComercialId: anterior.gerenteComercialId } as CadastroPromotora : null;
    const resumo = resumirAlteracoes(snapshot, dados);
    if (!resumo && anterior) return anterior;
    const promotora = id
      ? await tx.promotora.update({ where: { id }, data: { ...dados, atualizadoPor: autor } })
      : await tx.promotora.create({ data: { ...dados, criadoPor: autor, atualizadoPor: autor } });
    await tx.historicoPromotora.create({ data: { promotoraId: promotora.id, autor, resumo, ...(snapshot ? { anterior: snapshot } : {}), posterior: dados } });
    if (usuario?.email) await tx.auditoriaUsuario.create({ data: { userId: usuario.id, userEmail: usuario.email, userName: usuario.displayName || usuario.name || usuario.email, acao: id ? 'Promotora atualizada' : 'Promotora cadastrada', rota: '/admin/hierarquia/promotoras', detalhes: `${promotora.id} · ${promotora.empresa} · ${promotora.nome}` } });
    return promotora;
  });
}
