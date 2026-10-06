import { EMPRESAS, type Empresa } from '@/lib/empresas';

export type TipoEntidade = 'gerente' | 'equipe' | 'vendedor';
export type OrigemHierarquia = 'front_v1' | 'front_v2' | 'funcao' | 'manual';
export type Resultado<T> = { ok: true; dados: T } | { ok: false; erro: string };

export function normalizarIdentificador(valor: string) {
  return valor.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').toUpperCase();
}

export function empresaValida(valor: string): valor is Empresa {
  return (EMPRESAS as readonly string[]).includes(valor);
}

export function lerCadastro(formData: FormData): Resultado<{
  empresa: Empresa;
  nome: string;
  nomeNormalizado: string;
  codigoExterno: string | null;
}> {
  const empresa = String(formData.get('empresa') ?? '').trim().toUpperCase();
  const nome = String(formData.get('nome') ?? '').trim().replace(/\s+/g, ' ');
  const codigoExterno = String(formData.get('codigoExterno') ?? '').trim();
  if (!empresaValida(empresa)) return { ok: false, erro: 'Empresa inválida.' };
  if (nome.length < 2 || nome.length > 120) return { ok: false, erro: 'Informe um nome entre 2 e 120 caracteres.' };
  if (codigoExterno.length > 100) return { ok: false, erro: 'O código externo deve ter no máximo 100 caracteres.' };
  return { ok: true, dados: { empresa, nome, nomeNormalizado: normalizarIdentificador(nome), codigoExterno: codigoExterno || null } };
}

export function lerDataCivil(valor: string, fimDoDia = false): Date | null {
  if (!/^\d{4}-(0[1-9]|1[0-2])-([012]\d|3[01])$/.test(valor)) return null;
  const verificacao = new Date(`${valor}T12:00:00.000Z`);
  if (verificacao.toISOString().slice(0, 10) !== valor) return null;
  return new Date(`${valor}T${fimDoDia ? '23:59:59.999' : '00:00:00.000'}-03:00`);
}

export function lerVigencia(formData: FormData): Resultado<{ inicio: Date; fim: Date | null }> {
  const inicio = lerDataCivil(String(formData.get('inicio') ?? '').trim());
  const fimBruto = String(formData.get('fim') ?? '').trim();
  const fim = fimBruto ? lerDataCivil(fimBruto, true) : null;
  if (!inicio || (fimBruto && !fim)) return { ok: false, erro: 'Informe uma vigência válida.' };
  if (fim && fim < inicio) return { ok: false, erro: 'O fim da vigência não pode ser anterior ao início.' };
  return { ok: true, dados: { inicio, fim } };
}

export function intervaloSobrepoe(inicioA: Date, fimA: Date | null, inicioB: Date, fimB: Date | null) {
  return inicioA <= (fimB ?? new Date(8.64e15)) && inicioB <= (fimA ?? new Date(8.64e15));
}

export function vinculoVigente(
  vinculo: { inicio: Date | string; fim: Date | string | null },
  referencia = new Date(),
) {
  return new Date(vinculo.inicio) <= referencia && (!vinculo.fim || new Date(vinculo.fim) >= referencia);
}

export function validarMesmoGrupo(empresaA: string, empresaB: string) {
  if (empresaA !== empresaB) throw new Error('Os registros do vínculo precisam pertencer à mesma empresa.');
}

export function tipoEntidadeValido(valor: string): valor is TipoEntidade {
  return ['gerente', 'equipe', 'vendedor'].includes(valor);
}

export function origemValida(valor: string): valor is OrigemHierarquia {
  return ['front_v1', 'front_v2', 'funcao', 'manual'].includes(valor);
}

export function chaveHierarquia(tipo: TipoEntidade, origem: OrigemHierarquia, valor: string) {
  return `${tipo}|${origem}|${normalizarIdentificador(valor)}`;
}

export function agruparItensDaFonte(itens: readonly { tipo: TipoEntidade; origem: OrigemHierarquia; valor: string }[]) {
  const agregados = new Map<string, { tipo: TipoEntidade; origem: OrigemHierarquia; valor: string; valorNormalizado: string; ocorrencias: number }>();
  for (const item of itens) {
    const valor = item.valor.trim();
    const valorNormalizado = normalizarIdentificador(valor);
    if (!valorNormalizado || valorNormalizado === '(NAO INFORMADO)') continue;
    const chave = chaveHierarquia(item.tipo, item.origem, valor);
    const atual = agregados.get(chave);
    if (atual) atual.ocorrencias += 1;
    else agregados.set(chave, { ...item, valor, valorNormalizado, ocorrencias: 1 });
  }
  return agregados;
}

export type EntidadeHierarquia = { id: string; nome: string; nomeNormalizado: string };
export type AliasResolucaoHierarquia = {
  tipo: string;
  origem: string;
  valorNormalizado: string;
  gerenteId: string | null;
  equipeId: string | null;
  vendedorId: string | null;
};
export type VinculoEquipeGerenteResolucao = { equipeId: string; gerenteId: string; inicio: Date; fim: Date | null };
export type VinculoVendedorEquipeResolucao = { vendedorId: string; equipeId: string; inicio: Date; fim: Date | null };
export type CatalogoHierarquia = {
  gerentes: readonly EntidadeHierarquia[];
  equipes: readonly EntidadeHierarquia[];
  vendedores: readonly EntidadeHierarquia[];
  aliases: readonly AliasResolucaoHierarquia[];
  vinculosEquipeGerente: readonly VinculoEquipeGerenteResolucao[];
  vinculosVendedorEquipe: readonly VinculoVendedorEquipeResolucao[];
};
export type EntradaResolucaoHierarquia = {
  chave: string;
  data: string;
  origem: OrigemHierarquia;
  gerente: string;
  equipe: string;
  vendedor: string;
};
export type ResolucaoHierarquia = {
  chave: string;
  gerenteId: string | null;
  equipeId: string | null;
  vendedorId: string | null;
  gerenteNome: string | null;
  equipeNome: string | null;
  vendedorNome: string | null;
  completa: boolean;
  divergente: boolean;
};

function indiceNomeUnico(entidades: readonly EntidadeHierarquia[]) {
  const porNome = new Map<string, string | null>();
  for (const entidade of entidades) {
    const anterior = porNome.get(entidade.nomeNormalizado);
    porNome.set(entidade.nomeNormalizado, anterior === undefined ? entidade.id : null);
  }
  return porNome;
}

const vigenteNaData = (vinculo: { inicio: Date; fim: Date | null }, data: Date) =>
  vinculo.inicio <= data && (!vinculo.fim || vinculo.fim >= data);

export function resolverHierarquiaHistorica(
  entradas: readonly EntradaResolucaoHierarquia[],
  catalogo: CatalogoHierarquia,
): Map<string, ResolucaoHierarquia> {
  const entidades = {
    gerente: catalogo.gerentes,
    equipe: catalogo.equipes,
    vendedor: catalogo.vendedores,
  } satisfies Record<TipoEntidade, readonly EntidadeHierarquia[]>;
  const nomes = {
    gerente: indiceNomeUnico(catalogo.gerentes),
    equipe: indiceNomeUnico(catalogo.equipes),
    vendedor: indiceNomeUnico(catalogo.vendedores),
  } satisfies Record<TipoEntidade, Map<string, string | null>>;
  const aliases = new Map<string, string>();
  for (const alias of catalogo.aliases) {
    if (!tipoEntidadeValido(alias.tipo) || !origemValida(alias.origem)) continue;
    const alvo = alias.tipo === 'gerente' ? alias.gerenteId : alias.tipo === 'equipe' ? alias.equipeId : alias.vendedorId;
    if (alvo) aliases.set(chaveHierarquia(alias.tipo, alias.origem, alias.valorNormalizado), alvo);
  }
  const porId = new Map(Object.values(entidades).flatMap((lista) => lista.map((entidade) => [entidade.id, entidade] as const)));
  const idDaFonte = (tipo: TipoEntidade, origem: OrigemHierarquia, valor: string) => {
    const normalizado = normalizarIdentificador(valor);
    return aliases.get(chaveHierarquia(tipo, origem, normalizado)) ?? nomes[tipo].get(normalizado) ?? null;
  };
  const resultado = new Map<string, ResolucaoHierarquia>();
  for (const entrada of entradas) {
    const referencia = new Date(`${entrada.data}T12:00:00.000Z`);
    const gerenteFonteId = idDaFonte('gerente', entrada.origem, entrada.gerente);
    const equipeFonteId = idDaFonte('equipe', entrada.origem, entrada.equipe);
    const vendedorId = idDaFonte('vendedor', entrada.origem, entrada.vendedor);
    const vinculosVendedor = vendedorId
      ? catalogo.vinculosVendedorEquipe.filter((vinculo) => vinculo.vendedorId === vendedorId && vigenteNaData(vinculo, referencia))
      : [];
    const equipeDoVinculo = vinculosVendedor.length === 1 ? vinculosVendedor[0].equipeId : null;
    const equipeId = equipeDoVinculo ?? equipeFonteId;
    const vinculosGerente = equipeId
      ? catalogo.vinculosEquipeGerente.filter((vinculo) => vinculo.equipeId === equipeId && vigenteNaData(vinculo, referencia))
      : [];
    const gerenteDoVinculo = vinculosGerente.length === 1 ? vinculosGerente[0].gerenteId : null;
    const gerenteId = gerenteDoVinculo;
    const divergente = vinculosVendedor.length > 1
      || vinculosGerente.length > 1
      || (!!equipeDoVinculo && !!equipeFonteId && equipeDoVinculo !== equipeFonteId)
      || (!!gerenteDoVinculo && !!gerenteFonteId && gerenteDoVinculo !== gerenteFonteId);
    const completa = !!gerenteFonteId && !!equipeFonteId && !!vendedorId
      && !!equipeDoVinculo && !!gerenteDoVinculo && !divergente;
    resultado.set(entrada.chave, {
      chave: entrada.chave,
      gerenteId,
      equipeId,
      vendedorId,
      gerenteNome: gerenteId ? porId.get(gerenteId)?.nome ?? null : null,
      equipeNome: equipeId ? porId.get(equipeId)?.nome ?? null : null,
      vendedorNome: vendedorId ? porId.get(vendedorId)?.nome ?? null : null,
      completa,
      divergente,
    });
  }
  return resultado;
}
