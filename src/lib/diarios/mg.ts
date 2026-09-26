import type { AtoOficial } from '../diarioOficial';
import { desdeDoPeriodo, paraAto, type FonteDiario, type ItemDiario } from './tipos';

// Jornal Minas Gerais (Imprensa Oficial de MG). O site é um SPA Angular que consome uma API JSON
// própria; ela exige um Bearer anônimo, emitido por POST Autenticacao/Autenticar sem credencial
// (é o mesmo handshake que todo visitante do portal faz). Os textos indexados vêm SEM acento.
const API = 'https://www.jornalminasgerais.mg.gov.br/api/v1';
const SITE = 'https://www.jornalminasgerais.mg.gov.br/edicao-do-dia';
const NOME = 'Diário Oficial de Minas Gerais';
const SEPLAG = 'GOV MINAS GERAIS SEPLAG';
const PMMG = 'GOV MINAS GERAIS PMMG';
const REVALIDAR_SEGUNDOS = 3600;
const TIMEOUT_MS = 15000;
const HEADERS = { 'User-Agent': 'painel-executivo-teck (consulta publica de atos sobre consignacao)' };

// "consignado" sozinho traz muito ruído ("conforme consignado", "créditos consignados"): fora.
const CONSULTAS = ['consignacao em folha', 'consignataria', 'consignatarias', 'margem consignavel'];

export interface HitMG {
  idJornal: number;
  dataPublicacao: string; // 2026-09-24T00:00:00
  tipoCaderno: string;
  textoResultado: string;
  pagina: number;
}

const ASSUNTO_CONSIGNACAO =
  /consignat[aá]ri|margem consign|consigna(?:[cç][aã]o|[cç][oõ]es) em folha|consignado[s]? em folha|emprestimo[s]? consignado|desconto[s]? consignado/i;
// Nome de unidade, "consignação mercantil/de materiais" e "margem consignável livre" (proposta de imóvel) não são ato sobre o tema.
const RUIDO_LOCAL = /coordena[cç][aã]o de consigna[cç][aã]o|regime de consigna|consigna[cç][aã]o mercantil|margem consign[aá]vel livre/gi;

export const relevanteMG = (trecho: string) => ASSUNTO_CONSIGNACAO.test(trecho.replace(RUIDO_LOCAL, ' '));

export function conveniosDoTrecho(texto: string): string[] {
  const pm = /pol[ií]cia militar|pmmg|militar(es)?\b/i.test(texto);
  const civil = /planejamento e gest[aã]o|seplag|servidor(es)? civi/i.test(texto);
  if (pm && !civil) return [PMMG];
  if (civil && !pm) return [SEPLAG];
  return [SEPLAG, PMMG];
}

const dataBr = (iso: string) => iso.split('-').reverse().join('/');

export function itensDeHits(hits: HitMG[]): ItemDiario[] {
  const vistos = new Set<string>();
  const saida: ItemDiario[] = [];
  for (const h of hits) {
    const dataIso = (h.dataPublicacao ?? '').slice(0, 10);
    const trecho = (h.textoResultado ?? '').replace(/\s+/g, ' ').trim();
    if (!h.idJornal || !/^\d{4}-\d{2}-\d{2}$/.test(dataIso) || !trecho || !relevanteMG(trecho)) continue;
    const id = `${h.idJornal}-p${h.pagina}`;
    if (vistos.has(id)) continue;
    vistos.add(id);
    saida.push({
      id,
      titulo: `Jornal Minas Gerais, ${h.tipoCaderno} de ${dataBr(dataIso)}, p. ${h.pagina}`,
      orgao: h.tipoCaderno,
      dataIso,
      link: SITE, // o portal não tem deep link estável; edição e página estão no título
      trecho,
    });
  }
  return saida;
}

export function atosDeHits(hits: HitMG[], desde: string): AtoOficial[] {
  return itensDeHits(hits)
    .filter((i) => i.dataIso >= desde)
    .flatMap((i) => paraAto(i, conveniosDoTrecho(i.trecho), NOME) ?? [])
    .sort((a, b) => b.data.localeCompare(a.data));
}

async function token(): Promise<string | null> {
  try {
    const r = await fetch(`${API}/Autenticacao/Autenticar`, {
      method: 'POST',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!r.ok) return null;
    const dados = ((await r.json()) as { dados?: unknown }).dados;
    return typeof dados === 'string' && dados ? dados : null;
  } catch {
    return null;
  }
}

// null = a consulta falhou (diferente de "sem resultado", que é []).
async function pesquisar(termo: string, de: string, ate: string, tk: string): Promise<HitMG[] | null> {
  const qs = new URLSearchParams({
    DataPublicacaoInicial: de,
    DataPublicacaoFinal: ate,
    TextoPesquisa: termo,
    DiarioExecutivo: 'true',
    DiarioMunicipios: 'false',
    DiarioTerceiros: 'false',
    EdicaoExtra: 'true',
    PaginaAtual: '1',
    TamanhoPagina: '50',
  });
  try {
    const r = await fetch(`${API}/Pesquisa/PesquisarJornaisPaginados?${qs}`, {
      headers: { ...HEADERS, Authorization: `Bearer ${tk}` },
      next: { revalidate: REVALIDAR_SEGUNDOS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!r.ok) return null;
    const dados = ((await r.json()) as { dados?: unknown }).dados;
    return Array.isArray(dados) ? (dados as HitMG[]) : null;
  } catch {
    return null;
  }
}

export const fonteMG: FonteDiario = {
  id: 'mg',
  nome: NOME,
  convenios: [SEPLAG, PMMG],
  async buscar(periodo) {
    try {
      const tk = await token();
      if (!tk) return null;
      const desde = desdeDoPeriodo(periodo);
      const ate = new Date().toISOString().slice(0, 10);
      const respostas = await Promise.all(CONSULTAS.map((c) => pesquisar(c, desde, ate, tk)));
      if (respostas.every((r) => r === null)) return null;
      return atosDeHits(respostas.flatMap((r) => r ?? []), desde);
    } catch {
      return null;
    }
  },
};
