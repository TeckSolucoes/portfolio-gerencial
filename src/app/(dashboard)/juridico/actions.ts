'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { cnpjValido, somenteDigitos } from '@/lib/cnpj';
import { consultarCadastro } from '@/lib/juridico';
import { requireFuncionalidadeForAction, requireSessionForAction } from '@/lib/authz';
import { registrarAuditoria } from '@/lib/auditoria';

export type JuridicoFormState = { ok?: string; error?: string } | undefined;

export async function cadastrarCnpj(_anterior: JuridicoFormState, formData: FormData): Promise<JuridicoFormState> {
  let session;
  try {
    session = await requireSessionForAction();
    await requireFuncionalidadeForAction('juridico');
  } catch {
    return { error: 'Sem permissão para cadastrar CNPJ.' };
  }
  const cnpj = somenteDigitos(String(formData.get('cnpj') ?? ''));
  if (!cnpjValido(cnpj)) return { error: 'Informe um CNPJ válido com 14 dígitos.' };
  if (await prisma.juridicoEmpresa.findUnique({ where: { cnpj } })) return { error: 'Este CNPJ já está sendo monitorado.' };

  try {
    const dados = await consultarCadastro(cnpj);
    const razaoSocial = String(dados.razao_social ?? '').trim();
    if (!razaoSocial) return { error: 'A fonte cadastral não retornou a razão social.' };
    const empresa = await prisma.juridicoEmpresa.create({ data: {
      cnpj,
      razaoSocial,
      nomeFantasia: String(dados.nome_fantasia ?? '').trim() || null,
      situacaoCadastral: String(dados.descricao_situacao_cadastral ?? dados.situacao_cadastral ?? '').trim() || null,
      naturezaJuridica: String(dados.natureza_juridica ?? '').trim() || null,
      atividadePrincipal: String(dados.cnae_fiscal_descricao ?? '').trim() || null,
      municipio: String(dados.municipio ?? '').trim() || null,
      uf: String(dados.uf ?? '').trim() || null,
      criadoPor: session.user.email ?? session.user.displayName,
      dadosAtualizadosEm: new Date(),
      fontes: { create: { fonte: 'cadastro', status: 'ok', mensagem: 'Registro consultado na BrasilAPI.' } },
    } });
    await registrarAuditoria(session.user, { acao: 'CNPJ incluído no Jurídico', rota: '/juridico', detalhes: `${cnpj} · ${razaoSocial}` });
    revalidatePath('/juridico');
    return { ok: `${empresa.razaoSocial} adicionada ao monitoramento.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Não foi possível consultar o CNPJ.' };
  }
}

export async function alternarCnpj(formData: FormData) {
  const session = await requireSessionForAction();
  await requireFuncionalidadeForAction('juridico');
  const id = String(formData.get('id') ?? '');
  const ativo = String(formData.get('ativo') ?? '') === 'true';
  const empresa = await prisma.juridicoEmpresa.update({ where: { id }, data: { ativo } });
  await registrarAuditoria(session.user, { acao: ativo ? 'Monitoramento de CNPJ ativado' : 'Monitoramento de CNPJ pausado', rota: '/juridico', detalhes: empresa.cnpj });
  revalidatePath('/juridico');
}

export async function marcarEventosVistos(formData: FormData) {
  await requireFuncionalidadeForAction('juridico');
  const empresaId = String(formData.get('empresaId') ?? '');
  await prisma.juridicoEvento.updateMany({ where: empresaId ? { empresaId } : {}, data: { visto: true } });
  revalidatePath('/juridico');
}
