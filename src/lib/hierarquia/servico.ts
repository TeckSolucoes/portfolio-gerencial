import 'server-only';
import { prisma } from '@/lib/prisma';
import type { Empresa } from '@/lib/empresas';
import {
  agruparItensDaFonte,
  chaveHierarquia,
  empresaValida,
  intervaloSobrepoe,
  normalizarIdentificador,
  origemValida,
  resolverHierarquiaHistorica,
  tipoEntidadeValido,
  validarMesmoGrupo,
  type OrigemHierarquia,
  type EntradaResolucaoHierarquia,
  type TipoEntidade,
} from './dominio';

type Cadastro = {
  empresa: Empresa;
  nome: string;
  nomeNormalizado: string;
  codigoExterno: string | null;
};

type Vigencia = { inicio: Date; fim: Date | null };

export type ResumoEstruturaComercial = {
  gerentesAtivos: number;
  equipesAtivas: number;
  vendedoresAtivos: number;
  vinculosAtivos: number;
  pendencias: number;
};

export async function listarEstruturaComercial() {
  const [gerentes, equipes, vendedores, semVinculo, totalPendencias] = await Promise.all([
    prisma.gerenteComercial.findMany({
      orderBy: [{ empresa: 'asc' }, { nome: 'asc' }],
      include: { vinculosEquipe: { orderBy: { inicio: 'desc' }, take: 500, include: { equipe: true, gerente: true } }, aliases: true },
    }),
    prisma.equipeComercial.findMany({
      orderBy: [{ empresa: 'asc' }, { nome: 'asc' }],
      include: {
        vinculosGerente: { orderBy: { inicio: 'desc' }, take: 500, include: { equipe: true, gerente: true } },
        vinculosVendedor: { orderBy: { inicio: 'desc' }, take: 500, include: { vendedor: true, equipe: true } },
        aliases: true,
      },
    }),
    prisma.vendedorComercial.findMany({
      orderBy: [{ empresa: 'asc' }, { nome: 'asc' }],
      include: { vinculosEquipe: { orderBy: { inicio: 'desc' }, take: 500, include: { equipe: true, vendedor: true } }, aliases: true },
    }),
    prisma.itemSemVinculo.findMany({ where: { status: 'pendente' }, orderBy: { ultimoEm: 'desc' }, take: 500 }),
    prisma.itemSemVinculo.count({ where: { status: 'pendente' } }),
  ]);
  const agora = new Date();
  const vinculoAtivo = (vinculo: { inicio: Date; fim: Date | null }) => vinculo.inicio <= agora && (!vinculo.fim || vinculo.fim >= agora);
  const resumo: ResumoEstruturaComercial = {
    gerentesAtivos: gerentes.filter((item) => item.ativo).length,
    equipesAtivas: equipes.filter((item) => item.ativo).length,
    vendedoresAtivos: vendedores.filter((item) => item.ativo).length,
    vinculosAtivos:
      equipes.reduce((total, equipe) => total + equipe.vinculosGerente.filter(vinculoAtivo).length, 0)
      + vendedores.reduce((total, vendedor) => total + vendedor.vinculosEquipe.filter(vinculoAtivo).length, 0),
    pendencias: totalPendencias,
  };
  return { gerentes, equipes, vendedores, semVinculo, resumo };
}

export async function listarGerentesAtivos(empresa?: Empresa) {
  return prisma.gerenteComercial.findMany({
    where: { ativo: true, ...(empresa ? { empresa } : {}) },
    orderBy: [{ empresa: 'asc' }, { nome: 'asc' }],
    select: { id: true, empresa: true, nome: true },
  });
}

export async function listarValoresGerenteNaFonte(gerenteId: string, empresa: Empresa, origem: OrigemHierarquia) {
  const gerente = await prisma.gerenteComercial.findUnique({
    where: { id: gerenteId },
    select: {
      nome: true,
      empresa: true,
      ativo: true,
      aliases: { where: { tipo: 'gerente', origem }, select: { valor: true } },
    },
  });
  if (!gerente?.ativo || gerente.empresa !== empresa) return null;
  return { nome: gerente.nome, valores: [...new Set([gerente.nome, ...gerente.aliases.map((alias) => alias.valor)])] };
}

export async function listarRecortesGerenteNaFonte(gerenteId: string, empresa: Empresa, origem: OrigemHierarquia) {
  const gerente = await prisma.gerenteComercial.findUnique({
    where: { id: gerenteId },
    select: {
      empresa: true,
      ativo: true,
      vinculosEquipe: {
        select: {
          inicio: true,
          fim: true,
          equipe: {
            select: {
              nome: true,
              aliases: { where: { tipo: 'equipe', origem }, select: { valor: true } },
            },
          },
        },
      },
    },
  });
  if (!gerente?.ativo || gerente.empresa !== empresa) return null;
  return gerente.vinculosEquipe.map((vinculo) => ({
    inicio: vinculo.inicio,
    fim: vinculo.fim,
    equipes: [...new Set([vinculo.equipe.nome, ...vinculo.equipe.aliases.map((alias) => alias.valor)])],
  }));
}

export async function obterVersaoHierarquia(empresas: readonly Empresa[]) {
  const whereEmpresa = { in: [...empresas] };
  const [gerentes, equipes, vendedores, aliases, vinculosEquipe, vinculosVendedor] = await Promise.all([
    prisma.gerenteComercial.findMany({ where: { empresa: whereEmpresa }, select: { id: true, updatedAt: true } }),
    prisma.equipeComercial.findMany({ where: { empresa: whereEmpresa }, select: { id: true, updatedAt: true } }),
    prisma.vendedorComercial.findMany({ where: { empresa: whereEmpresa }, select: { id: true, updatedAt: true } }),
    prisma.aliasHierarquia.findMany({ where: { empresa: whereEmpresa }, select: { id: true, createdAt: true, valorNormalizado: true, gerenteId: true, equipeId: true, vendedorId: true } }),
    prisma.vinculoEquipeGerente.findMany({ where: { equipe: { empresa: whereEmpresa } }, select: { id: true, inicio: true, fim: true, createdAt: true } }),
    prisma.vinculoVendedorEquipe.findMany({ where: { vendedor: { empresa: whereEmpresa } }, select: { id: true, inicio: true, fim: true, createdAt: true } }),
  ]);
  return [
    ...gerentes.map((item) => `g:${item.id}:${item.updatedAt.toISOString()}`),
    ...equipes.map((item) => `e:${item.id}:${item.updatedAt.toISOString()}`),
    ...vendedores.map((item) => `v:${item.id}:${item.updatedAt.toISOString()}`),
    ...aliases.map((item) => `a:${item.id}:${item.createdAt.toISOString()}:${item.valorNormalizado}:${item.gerenteId ?? item.equipeId ?? item.vendedorId ?? ''}`),
    ...vinculosEquipe.map((item) => `eg:${item.id}:${item.inicio.toISOString()}:${item.fim?.toISOString() ?? ''}:${item.createdAt.toISOString()}`),
    ...vinculosVendedor.map((item) => `ve:${item.id}:${item.inicio.toISOString()}:${item.fim?.toISOString() ?? ''}:${item.createdAt.toISOString()}`),
  ].sort().join(';');
}

export async function resolverHierarquiaNaData(
  empresa: Empresa,
  entradas: readonly EntradaResolucaoHierarquia[],
) {
  if (entradas.length === 0) return new Map();
  const origens = [...new Set(entradas.map((entrada) => entrada.origem))];
  const [gerentes, equipes, vendedores, aliases, vinculosEquipeGerente, vinculosVendedorEquipe] = await Promise.all([
    prisma.gerenteComercial.findMany({ where: { empresa }, select: { id: true, nome: true, nomeNormalizado: true } }),
    prisma.equipeComercial.findMany({ where: { empresa }, select: { id: true, nome: true, nomeNormalizado: true } }),
    prisma.vendedorComercial.findMany({ where: { empresa }, select: { id: true, nome: true, nomeNormalizado: true } }),
    prisma.aliasHierarquia.findMany({
      where: { empresa, origem: { in: origens } },
      select: { tipo: true, origem: true, valorNormalizado: true, gerenteId: true, equipeId: true, vendedorId: true },
    }),
    prisma.vinculoEquipeGerente.findMany({
      where: { equipe: { empresa } },
      select: { equipeId: true, gerenteId: true, inicio: true, fim: true },
    }),
    prisma.vinculoVendedorEquipe.findMany({
      where: { vendedor: { empresa } },
      select: { vendedorId: true, equipeId: true, inicio: true, fim: true },
    }),
  ]);
  return resolverHierarquiaHistorica(entradas, {
    gerentes,
    equipes,
    vendedores,
    aliases,
    vinculosEquipeGerente,
    vinculosVendedorEquipe,
  });
}

export async function cadastrarEntidade(tipo: TipoEntidade, dados: Cadastro, autor: string) {
  const data = { ...dados, criadoPor: autor, atualizadoPor: autor };
  if (tipo === 'gerente') return prisma.gerenteComercial.create({ data });
  if (tipo === 'equipe') return prisma.equipeComercial.create({ data });
  return prisma.vendedorComercial.create({ data });
}

export async function alternarEntidade(tipo: TipoEntidade, id: string, ativo: boolean, autor: string) {
  return prisma.$transaction(async (tx) => {
  if (!ativo) {
    const agora = new Date();
    const vigente = { inicio: { lte: agora }, OR: [{ fim: null }, { fim: { gte: agora } }] };
    const vinculada = tipo === 'gerente'
      ? await tx.vinculoEquipeGerente.findFirst({ where: { gerenteId: id, ...vigente }, select: { id: true } })
      : tipo === 'equipe'
        ? await tx.vinculoEquipeGerente.findFirst({ where: { equipeId: id, ...vigente }, select: { id: true } })
          ?? await tx.vinculoVendedorEquipe.findFirst({ where: { equipeId: id, ...vigente }, select: { id: true } })
        : await tx.vinculoVendedorEquipe.findFirst({ where: { vendedorId: id, ...vigente }, select: { id: true } });
    if (vinculada) throw new Error('Encerre os vínculos vigentes antes de inativar este cadastro.');
  }
  const data = { ativo, atualizadoPor: autor };
  if (tipo === 'gerente') return tx.gerenteComercial.update({ where: { id }, data });
  if (tipo === 'equipe') return tx.equipeComercial.update({ where: { id }, data });
  return tx.vendedorComercial.update({ where: { id }, data });
  });
}

export async function vincularEquipeAoGerente(equipeId: string, gerenteId: string, vigencia: Vigencia, autor: string) {
  return prisma.$transaction(async (tx) => {
    const [equipe, gerente, existentes] = await Promise.all([
      tx.equipeComercial.findUniqueOrThrow({ where: { id: equipeId } }),
      tx.gerenteComercial.findUniqueOrThrow({ where: { id: gerenteId } }),
      tx.vinculoEquipeGerente.findMany({ where: { equipeId } }),
    ]);
    if (!equipe.ativo || !gerente.ativo) throw new Error('Somente cadastros ativos podem receber novos vínculos.');
    validarMesmoGrupo(equipe.empresa, gerente.empresa);
    if (existentes.some((vinculo) => intervaloSobrepoe(vinculo.inicio, vinculo.fim, vigencia.inicio, vigencia.fim))) {
      throw new Error('A equipe já possui gerente nesse período.');
    }
    return tx.vinculoEquipeGerente.create({ data: { equipeId, gerenteId, ...vigencia, criadoPor: autor } });
  });
}

export async function vincularVendedorAEquipe(vendedorId: string, equipeId: string, vigencia: Vigencia, autor: string) {
  return prisma.$transaction(async (tx) => {
    const [vendedor, equipe, existentes] = await Promise.all([
      tx.vendedorComercial.findUniqueOrThrow({ where: { id: vendedorId } }),
      tx.equipeComercial.findUniqueOrThrow({ where: { id: equipeId } }),
      tx.vinculoVendedorEquipe.findMany({ where: { vendedorId } }),
    ]);
    if (!vendedor.ativo || !equipe.ativo) throw new Error('Somente cadastros ativos podem receber novos vínculos.');
    validarMesmoGrupo(vendedor.empresa, equipe.empresa);
    if (existentes.some((vinculo) => intervaloSobrepoe(vinculo.inicio, vinculo.fim, vigencia.inicio, vigencia.fim))) {
      throw new Error('O vendedor já possui equipe nesse período.');
    }
    return tx.vinculoVendedorEquipe.create({ data: { vendedorId, equipeId, ...vigencia, criadoPor: autor } });
  });
}

export async function encerrarVinculo(tipo: 'equipe-gerente' | 'vendedor-equipe', id: string, fim: Date) {
  return prisma.$transaction(async (tx) => {
  if (tipo === 'equipe-gerente') {
    const atual = await tx.vinculoEquipeGerente.findUniqueOrThrow({ where: { id } });
    if (fim < atual.inicio) throw new Error('O fim não pode ser anterior ao início do vínculo.');
    const outros = await tx.vinculoEquipeGerente.findMany({ where: { equipeId: atual.equipeId, id: { not: id } } });
    if (outros.some((vinculo) => intervaloSobrepoe(atual.inicio, fim, vinculo.inicio, vinculo.fim))) {
      throw new Error('A data final sobrepõe outro vínculo da equipe.');
    }
    return tx.vinculoEquipeGerente.update({ where: { id }, data: { fim } });
  }
  const atual = await tx.vinculoVendedorEquipe.findUniqueOrThrow({ where: { id } });
  if (fim < atual.inicio) throw new Error('O fim não pode ser anterior ao início do vínculo.');
  const outros = await tx.vinculoVendedorEquipe.findMany({ where: { vendedorId: atual.vendedorId, id: { not: id } } });
  if (outros.some((vinculo) => intervaloSobrepoe(atual.inicio, fim, vinculo.inicio, vinculo.fim))) {
    throw new Error('A data final sobrepõe outro vínculo do vendedor.');
  }
  return tx.vinculoVendedorEquipe.update({ where: { id }, data: { fim } });
  });
}

async function buscarEntidade(tipo: TipoEntidade, id: string) {
  if (tipo === 'gerente') return prisma.gerenteComercial.findUniqueOrThrow({ where: { id } });
  if (tipo === 'equipe') return prisma.equipeComercial.findUniqueOrThrow({ where: { id } });
  return prisma.vendedorComercial.findUniqueOrThrow({ where: { id } });
}

export async function salvarAlias(dados: {
  empresa: Empresa;
  tipo: TipoEntidade;
  origem: OrigemHierarquia;
  valor: string;
  entidadeId: string;
  autor: string;
}) {
  const entidade = await buscarEntidade(dados.tipo, dados.entidadeId);
  if (!entidade.ativo) throw new Error('Somente cadastros ativos podem receber aliases.');
  validarMesmoGrupo(dados.empresa, entidade.empresa);
  const alvo = dados.tipo === 'gerente'
    ? { gerenteId: dados.entidadeId }
    : dados.tipo === 'equipe'
      ? { equipeId: dados.entidadeId }
      : { vendedorId: dados.entidadeId };
  return prisma.aliasHierarquia.upsert({
    where: {
      empresa_tipo_origem_valorNormalizado: {
        empresa: dados.empresa,
        tipo: dados.tipo,
        origem: dados.origem,
        valorNormalizado: normalizarIdentificador(dados.valor),
      },
    },
    create: {
      empresa: dados.empresa,
      tipo: dados.tipo,
      origem: dados.origem,
      valor: dados.valor.trim(),
      valorNormalizado: normalizarIdentificador(dados.valor),
      criadoPor: dados.autor,
      ...alvo,
    },
    update: { valor: dados.valor.trim(), ...alvo },
  });
}

export async function localizarPorAlias(empresa: Empresa, tipo: TipoEntidade, origem: OrigemHierarquia, valor: string) {
  return prisma.aliasHierarquia.findUnique({
    where: { empresa_tipo_origem_valorNormalizado: { empresa, tipo, origem, valorNormalizado: normalizarIdentificador(valor) } },
  });
}

export async function registrarSemVinculo(empresa: Empresa, tipo: TipoEntidade, origem: OrigemHierarquia, valor: string) {
  const valorOriginal = valor.trim();
  const valorNormalizado = normalizarIdentificador(valorOriginal);
  if (!valorNormalizado) throw new Error('O valor sem vínculo não pode estar vazio.');
  return prisma.itemSemVinculo.upsert({
    where: { empresa_tipo_origem_valorNormalizado: { empresa, tipo, origem, valorNormalizado } },
    create: { empresa, tipo, origem, valorOriginal, valorNormalizado },
    update: { valorOriginal, ocorrencias: { increment: 1 }, ultimoEm: new Date(), status: 'pendente', resolvidoEm: null, resolvidoPor: null },
  });
}

export async function resolverSemVinculo(itemId: string, entidadeId: string, autor: string) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.itemSemVinculo.findUniqueOrThrow({ where: { id: itemId } });
    if (item.status !== 'pendente') throw new Error('Este item já foi tratado.');
    if (!empresaValida(item.empresa) || !tipoEntidadeValido(item.tipo) || !origemValida(item.origem)) throw new Error('A pendência possui dados inválidos.');
    const entidade = item.tipo === 'gerente'
      ? await tx.gerenteComercial.findUniqueOrThrow({ where: { id: entidadeId } })
      : item.tipo === 'equipe'
        ? await tx.equipeComercial.findUniqueOrThrow({ where: { id: entidadeId } })
        : await tx.vendedorComercial.findUniqueOrThrow({ where: { id: entidadeId } });
    if (!entidade.ativo) throw new Error('Somente cadastros ativos podem receber aliases.');
    validarMesmoGrupo(item.empresa, entidade.empresa);
    const alvo = item.tipo === 'gerente' ? { gerenteId: entidadeId } : item.tipo === 'equipe' ? { equipeId: entidadeId } : { vendedorId: entidadeId };
    await tx.aliasHierarquia.upsert({
      where: { empresa_tipo_origem_valorNormalizado: { empresa: item.empresa, tipo: item.tipo, origem: item.origem, valorNormalizado: item.valorNormalizado } },
      create: { empresa: item.empresa, tipo: item.tipo, origem: item.origem, valor: item.valorOriginal, valorNormalizado: item.valorNormalizado, criadoPor: autor, ...alvo },
      update: { valor: item.valorOriginal, ...alvo },
    });
    const tratado = await tx.itemSemVinculo.updateMany({
      where: { id: itemId, status: 'pendente' },
      data: { status: 'resolvido', resolvidoEm: new Date(), resolvidoPor: autor },
    });
    if (tratado.count !== 1) throw new Error('Este item já foi tratado.');
    return tratado;
  });
}

export async function resolverAliasesERegistrarPendencias(
  empresa: Empresa,
  itens: readonly { tipo: TipoEntidade; origem: OrigemHierarquia; valor: string }[],
) {
  const agregados = agruparItensDaFonte(itens);
  if (agregados.size === 0) return new Set<string>();

  const [aliases, gerentes, equipes, vendedores] = await Promise.all([
    prisma.aliasHierarquia.findMany({
      where: { empresa },
      include: { gerente: { select: { ativo: true } }, equipe: { select: { ativo: true } }, vendedor: { select: { ativo: true } } },
    }),
    prisma.gerenteComercial.findMany({ where: { empresa, ativo: true }, select: { nomeNormalizado: true } }),
    prisma.equipeComercial.findMany({ where: { empresa, ativo: true }, select: { nomeNormalizado: true } }),
    prisma.vendedorComercial.findMany({ where: { empresa, ativo: true }, select: { nomeNormalizado: true } }),
  ]);
  const nomesUnicos = (valores: readonly { nomeNormalizado: string }[]) => {
    const contagem = new Map<string, number>();
    for (const item of valores) contagem.set(item.nomeNormalizado, (contagem.get(item.nomeNormalizado) ?? 0) + 1);
    return new Set([...contagem].filter(([, total]) => total === 1).map(([nome]) => nome));
  };
  const oficiais = {
    gerente: nomesUnicos(gerentes),
    equipe: nomesUnicos(equipes),
    vendedor: nomesUnicos(vendedores),
  };
  const reconhecidas = new Set<string>();
  for (const alias of aliases) {
    const alvoAtivo = alias.tipo === 'gerente' ? alias.gerente?.ativo : alias.tipo === 'equipe' ? alias.equipe?.ativo : alias.vendedor?.ativo;
    if (alvoAtivo && tipoEntidadeValido(alias.tipo) && origemValida(alias.origem)) {
      const chave = chaveHierarquia(alias.tipo, alias.origem, alias.valorNormalizado);
      if (agregados.has(chave)) reconhecidas.add(chave);
    }
  }
  for (const [chave, item] of agregados) if (oficiais[item.tipo].has(item.valorNormalizado)) reconhecidas.add(chave);

  const desconhecidas = [...agregados].filter(([chave]) => !reconhecidas.has(chave));
  const agora = new Date();
  await prisma.$transaction([
    ...[...reconhecidas].map((chave) => {
      const item = agregados.get(chave)!;
      return prisma.itemSemVinculo.updateMany({
        where: { empresa, tipo: item.tipo, origem: item.origem, valorNormalizado: item.valorNormalizado, status: 'pendente' },
        data: { status: 'resolvido', resolvidoEm: agora, resolvidoPor: 'reconciliação automática' },
      });
    }),
    ...desconhecidas.flatMap(([, item]) => {
      const identidade = { empresa, tipo: item.tipo, origem: item.origem, valorNormalizado: item.valorNormalizado };
      return [
        prisma.itemSemVinculo.upsert({
          where: { empresa_tipo_origem_valorNormalizado: identidade },
          create: { ...identidade, valorOriginal: item.valor, ocorrencias: item.ocorrencias, ultimoEm: agora },
          update: { valorOriginal: item.valor, ocorrencias: item.ocorrencias, ultimoEm: agora },
        }),
        prisma.itemSemVinculo.updateMany({
          where: { ...identidade, status: { not: 'ignorado' } },
          data: { status: 'pendente', resolvidoEm: null, resolvidoPor: null },
        }),
      ];
    }),
  ]);
  return reconhecidas;
}

export async function ignorarSemVinculo(itemId: string, autor: string) {
  return prisma.itemSemVinculo.update({
    where: { id: itemId },
    data: { status: 'ignorado', resolvidoEm: new Date(), resolvidoPor: autor },
  });
}
