import 'server-only';

import { createHash } from 'node:crypto';
import { prisma } from './prisma';
import { noticias } from './mercado';
import { consultaMonitoramento, type FonteMonitoramento } from './juridicoConsulta';
import { erroConsultaPortal, normalizarChavePortal } from './portalTransparencia';

const TIMEOUT_MS = 15_000;
// O Portal permite mais chamadas, mas o Jurídico usa uma margem conservadora para
// dividir a chave com outras integrações: no máximo 120 chamadas/minuto (1 a cada 500 ms).
const INTERVALO_SANCOES_MS = 500;
const aguardar = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type CadastroApi = {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  descricao_situacao_cadastral?: string;
  situacao_cadastral?: number | string;
  natureza_juridica?: string;
  cnae_fiscal_descricao?: string;
  municipio?: string;
  uf?: string;
};

export async function consultarCadastro(cnpj: string): Promise<CadastroApi> {
  const resposta = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
    headers: { 'User-Agent': 'Teck-Portal-Juridico/1.0' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: 'no-store',
  });
  if (resposta.status === 404) throw new Error('CNPJ não encontrado na base cadastral.');
  if (!resposta.ok) throw new Error('A fonte cadastral não respondeu.');
  return resposta.json() as Promise<CadastroApi>;
}

export async function atualizarCadastroEmpresa(empresaId: string) {
  const empresa = await prisma.juridicoEmpresa.findUniqueOrThrow({ where: { id: empresaId } });
  try {
    const dados = await consultarCadastro(empresa.cnpj);
    const razaoSocial = String(dados.razao_social ?? '').trim();
    if (!razaoSocial) throw new Error('A fonte não retornou a razão social.');
    await prisma.$transaction([
      prisma.juridicoEmpresa.update({ where: { id: empresa.id }, data: {
        razaoSocial,
        nomeFantasia: String(dados.nome_fantasia ?? '').trim() || null,
        situacaoCadastral: String(dados.descricao_situacao_cadastral ?? dados.situacao_cadastral ?? '').trim() || null,
        naturezaJuridica: String(dados.natureza_juridica ?? '').trim() || null,
        atividadePrincipal: String(dados.cnae_fiscal_descricao ?? '').trim() || null,
        municipio: String(dados.municipio ?? '').trim() || null,
        uf: String(dados.uf ?? '').trim() || null,
        dadosAtualizadosEm: new Date(),
      } }),
      prisma.juridicoFonteStatus.upsert({
        where: { empresaId_fonte: { empresaId: empresa.id, fonte: 'cadastro' } },
        create: { empresaId: empresa.id, fonte: 'cadastro', status: 'ok', mensagem: 'Dados cadastrais atualizados.' },
        update: { status: 'ok', mensagem: 'Dados cadastrais atualizados.', consultadoEm: new Date() },
      }),
    ]);
    return 1;
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Falha cadastral.';
    await prisma.juridicoFonteStatus.upsert({
      where: { empresaId_fonte: { empresaId: empresa.id, fonte: 'cadastro' } },
      create: { empresaId: empresa.id, fonte: 'cadastro', status: 'erro', mensagem },
      update: { status: 'erro', mensagem, consultadoEm: new Date() },
    });
    throw error;
  }
}

const idEvento = (valor: string) => createHash('sha256').update(valor).digest('hex').slice(0, 32);

export async function coletarMencoes(fonte: FonteMonitoramento): Promise<number> {
  const empresas = await prisma.juridicoEmpresa.findMany({ where: { ativo: true } });
  let novos = 0;
  for (const empresa of empresas) {
    const consulta = consultaMonitoramento(empresa, fonte);
    try {
      const lista = await noticias(consulta, 10);
      if (lista === null) throw new Error('Google Notícias não respondeu.');
      for (const item of lista) {
        const identificador = idEvento(item.link);
        const existente = await prisma.juridicoEvento.findUnique({ where: { empresaId_fonte_identificador: { empresaId: empresa.id, fonte, identificador } }, select: { id: true } });
        await prisma.juridicoEvento.upsert({
          where: { empresaId_fonte_identificador: { empresaId: empresa.id, fonte, identificador } },
          create: { empresaId: empresa.id, fonte, tipo: fonte === 'internet' ? 'menção' : fonte === 'processos' ? 'processo' : 'licitação', identificador, titulo: item.titulo, resumo: item.fonte || null, url: item.link, dataEvento: item.publicadaEm },
          update: { titulo: item.titulo, resumo: item.fonte || null, url: item.link, dataEvento: item.publicadaEm },
        });
        if (!existente) novos += 1;
      }
      const complemento = fonte === 'processos' ? 'Busca de menções processuais públicas; não substitui consulta aos tribunais.' : fonte === 'licitacoes' ? 'Busca de menções públicas sobre licitações e contratos.' : 'Busca geral de notícias e menções públicas.';
      await prisma.juridicoFonteStatus.upsert({
        where: { empresaId_fonte: { empresaId: empresa.id, fonte } },
        create: { empresaId: empresa.id, fonte, status: 'ok', mensagem: `${lista.length} resultados. ${complemento}` },
        update: { status: 'ok', mensagem: `${lista.length} resultados. ${complemento}`, consultadoEm: new Date() },
      });
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : 'Falha na consulta.';
      await prisma.juridicoFonteStatus.upsert({
        where: { empresaId_fonte: { empresaId: empresa.id, fonte } },
        create: { empresaId: empresa.id, fonte, status: 'erro', mensagem },
        update: { status: 'erro', mensagem, consultadoEm: new Date() },
      });
    }
  }
  return novos;
}

type SancaoApi = Record<string, unknown>;

export async function coletarSancoes(): Promise<number> {
  const chave = normalizarChavePortal(process.env.PORTAL_TRANSPARENCIA_API_KEY);
  if (!chave) throw new Error('Configure PORTAL_TRANSPARENCIA_API_KEY no EasyPanel.');
  const empresas = await prisma.juridicoEmpresa.findMany({ where: { ativo: true } });
  let novos = 0;
  let primeiraConsulta = true;
  for (const empresa of empresas) {
    try {
      const resultados: { cadastro: string; item: SancaoApi }[] = [];
      for (const cadastro of ['ceis', 'cnep']) {
        if (!primeiraConsulta) await aguardar(INTERVALO_SANCOES_MS);
        primeiraConsulta = false;
        const url = `https://api.portaldatransparencia.gov.br/api-de-dados/${cadastro}?codigoSancionado=${empresa.cnpj}&pagina=1`;
        const resposta = await fetch(url, { headers: { 'chave-api-dados': chave }, signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store' });
        if (!resposta.ok) throw new Error(erroConsultaPortal(resposta.status, cadastro));
        for (const item of (await resposta.json()) as SancaoApi[]) resultados.push({ cadastro, item });
      }
      for (const { cadastro, item } of resultados) {
        const bruto = JSON.stringify(item);
        const identificador = idEvento(`${cadastro}:${String(item.id ?? item.numeroProcesso ?? bruto)}`);
        const existente = await prisma.juridicoEvento.findUnique({ where: { empresaId_fonte_identificador: { empresaId: empresa.id, fonte: 'sancoes', identificador } }, select: { id: true } });
        await prisma.juridicoEvento.upsert({
          where: { empresaId_fonte_identificador: { empresaId: empresa.id, fonte: 'sancoes', identificador } },
          create: { empresaId: empresa.id, fonte: 'sancoes', tipo: 'sanção', identificador, titulo: `${cadastro.toUpperCase()} · ${String(item.categoriaSancao ?? item.tipoSancao ?? 'Registro localizado')}`, resumo: String(item.orgaoSancionador ?? item.nomeOrgaoSancionador ?? '').slice(0, 300) || null, url: `https://portaldatransparencia.gov.br/sancoes?cnpj=${empresa.cnpj}` },
          update: {},
        });
        if (!existente) novos += 1;
      }
      await prisma.juridicoFonteStatus.upsert({ where: { empresaId_fonte: { empresaId: empresa.id, fonte: 'sancoes' } }, create: { empresaId: empresa.id, fonte: 'sancoes', status: 'ok', mensagem: `${resultados.length} registros em CEIS/CNEP.` }, update: { status: 'ok', mensagem: `${resultados.length} registros em CEIS/CNEP.`, consultadoEm: new Date() } });
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : 'Falha nas sanções.';
      await prisma.juridicoFonteStatus.upsert({ where: { empresaId_fonte: { empresaId: empresa.id, fonte: 'sancoes' } }, create: { empresaId: empresa.id, fonte: 'sancoes', status: 'erro', mensagem }, update: { status: 'erro', mensagem, consultadoEm: new Date() } });
    }
  }
  return novos;
}

export async function coletarCadastros(): Promise<number> {
  const empresas = await prisma.juridicoEmpresa.findMany({ where: { ativo: true }, select: { id: true } });
  let ok = 0;
  for (const empresa of empresas) ok += await atualizarCadastroEmpresa(empresa.id).catch(() => 0);
  return ok;
}
