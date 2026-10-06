'use server';

import { revalidatePath } from 'next/cache';
import { requireFuncionalidadeForAction, requireSuperadminForAction } from '@/lib/authz';
import { registrarAuditoria } from '@/lib/auditoria';
import { empresaValida, lerCadastro, lerDataCivil, lerVigencia, origemValida, tipoEntidadeValido } from '@/lib/hierarquia/dominio';
import {
  alternarEntidade,
  cadastrarEntidade,
  encerrarVinculo,
  ignorarSemVinculo,
  resolverSemVinculo,
  salvarAlias,
  vincularEquipeAoGerente,
  vincularVendedorAEquipe,
} from '@/lib/hierarquia/servico';

export type ResultadoAction = { ok: true } | { ok: false; erro: string };

const ROTA = '/admin/hierarquia';

function mensagem(erro: unknown) {
  if (!(erro instanceof Error)) return 'Não foi possível concluir a operação.';
  if (erro.message.includes('Unique constraint')) return 'Já existe um cadastro com esses dados.';
  if (erro.message.includes('Record to update not found') || erro.message.includes('No record was found')) return 'O registro não foi encontrado.';
  return erro.message;
}

async function executar(acao: (autor: string, usuario: Awaited<ReturnType<typeof requireSuperadminForAction>>['user']) => Promise<void>): Promise<ResultadoAction> {
  try {
    const session = await requireSuperadminForAction();
    await requireFuncionalidadeForAction('hierarquia');
    const autor = session.user.email ?? session.user.id;
    await acao(autor, session.user);
    revalidatePath(ROTA);
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagem(erro) };
  }
}

export async function salvarEntidade(formData: FormData): Promise<ResultadoAction> {
  return executar(async (autor, usuario) => {
    const tipo = String(formData.get('tipo') ?? '');
    if (!tipoEntidadeValido(tipo)) throw new Error('Tipo de cadastro inválido.');
    const cadastro = lerCadastro(formData);
    if (!cadastro.ok) throw new Error(cadastro.erro);
    const criado = await cadastrarEntidade(tipo, cadastro.dados, autor);
    await registrarAuditoria(usuario, { acao: `${tipo} comercial cadastrado`, rota: ROTA, detalhes: `${criado.empresa} · ${criado.nome}` });
  });
}

export async function criarVinculo(formData: FormData): Promise<ResultadoAction> {
  return executar(async (autor, usuario) => {
    const tipo = String(formData.get('tipo') ?? '');
    const origemId = String(formData.get('origemId') ?? '').trim();
    const destinoId = String(formData.get('destinoId') ?? '').trim();
    const vigencia = lerVigencia(formData);
    if (!origemId || !destinoId) throw new Error('Selecione os dois lados do vínculo.');
    if (!vigencia.ok) throw new Error(vigencia.erro);
    if (tipo === 'equipe-gerente') await vincularEquipeAoGerente(origemId, destinoId, vigencia.dados, autor);
    else if (tipo === 'vendedor-equipe') await vincularVendedorAEquipe(origemId, destinoId, vigencia.dados, autor);
    else throw new Error('Tipo de vínculo inválido.');
    await registrarAuditoria(usuario, { acao: 'Vínculo comercial criado', rota: ROTA, detalhes: `${tipo} · ${origemId} → ${destinoId}` });
  });
}

export async function salvarAliasAction(formData: FormData): Promise<ResultadoAction> {
  return executar(async (autor, usuario) => {
    const empresa = String(formData.get('empresa') ?? '').trim().toUpperCase();
    const tipo = String(formData.get('tipo') ?? '');
    const origem = String(formData.get('origem') ?? '');
    const valor = String(formData.get('valor') ?? '').trim();
    const entidadeId = String(formData.get('entidadeId') ?? '').trim();
    if (!empresaValida(empresa) || !tipoEntidadeValido(tipo) || !origemValida(origem)) throw new Error('Dados do alias são inválidos.');
    if (!valor || !entidadeId) throw new Error('Informe o valor recebido e o cadastro correspondente.');
    await salvarAlias({ empresa, tipo, origem, valor, entidadeId, autor });
    await registrarAuditoria(usuario, { acao: 'Alias da estrutura comercial salvo', rota: ROTA, detalhes: `${origem} · ${tipo} · ${valor}` });
  });
}

export async function encerrarVinculoAction(formData: FormData): Promise<ResultadoAction> {
  return executar(async (_autor, usuario) => {
    const tipo = String(formData.get('tipo') ?? '');
    const id = String(formData.get('id') ?? '').trim();
    const fim = lerDataCivil(String(formData.get('fim') ?? '').trim(), true);
    if (!['equipe-gerente', 'vendedor-equipe'].includes(tipo) || !id) throw new Error('Vínculo inválido.');
    if (!fim) throw new Error('Informe uma data final válida.');
    await encerrarVinculo(tipo as 'equipe-gerente' | 'vendedor-equipe', id, fim);
    await registrarAuditoria(usuario, { acao: 'Vínculo comercial encerrado', rota: ROTA, detalhes: `${tipo} · ${id}` });
  });
}

export async function alternarEntidadeAction(tipo: string, id: string, ativo: boolean): Promise<ResultadoAction> {
  return executar(async (autor, usuario) => {
    if (!tipoEntidadeValido(tipo) || !id) throw new Error('Cadastro inválido.');
    const alterado = await alternarEntidade(tipo, id, ativo, autor);
    await registrarAuditoria(usuario, { acao: ativo ? 'Cadastro comercial reativado' : 'Cadastro comercial arquivado', rota: ROTA, detalhes: `${tipo} · ${alterado.nome}` });
  });
}

export async function resolverSemVinculoAction(formData: FormData): Promise<ResultadoAction> {
  return executar(async (autor, usuario) => {
    const itemId = String(formData.get('itemId') ?? '').trim();
    const entidadeId = String(formData.get('entidadeId') ?? '').trim();
    if (!itemId || !entidadeId) throw new Error('Selecione o item e o cadastro correspondente.');
    await resolverSemVinculo(itemId, entidadeId, autor);
    await registrarAuditoria(usuario, { acao: 'Pendência de hierarquia resolvida', rota: ROTA, detalhes: itemId });
  });
}

export async function ignorarSemVinculoAction(id: string): Promise<ResultadoAction> {
  return executar(async (autor, usuario) => {
    if (!id) throw new Error('Pendência inválida.');
    await ignorarSemVinculo(id, autor);
    await registrarAuditoria(usuario, { acao: 'Pendência de hierarquia ignorada', rota: ROTA, detalhes: id });
  });
}
