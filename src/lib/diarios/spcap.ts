import type { AtoOficial } from '../diarioOficial';
import { desdeDoPeriodo, paraAto, semTags } from './tipos';
import type { FonteDiario, ItemDiario } from './tipos';

// Portal oficial do Diário Oficial da Cidade de São Paulo (DOSP). Não há JSON: a busca de matérias
// é um POST de formulário que devolve HTML (ISO-8859-1) com 10 resultados por página.
// A página seguinte (hdnInicio) não funciona sem sessão de navegador, então só lemos a 1ª página
// de cada termo (as mais recentes primeiro). O Querido Diário (territory 3550308) não é usado:
// o handshake TLS com api.queridodiario.ok.org.br falhou neste ambiente.
const BASE = 'https://diariooficial.prefeitura.sp.gov.br';
const URL_BUSCA = `${BASE}/md_epubli_controlador.php?acao=materias_pesquisar`;
const REVALIDAR_SEGUNDOS = 3600;
const TIMEOUT_MS = 20000;
const NOME = 'Diário Oficial da Cidade de São Paulo';
const CONVENIOS = ['PREF SÃO PAULO SP'];

const TERMOS = ['margem consignável', 'consignatária', 'empréstimo consignado', 'desconto em folha'];

const decodificar = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

const limpar = (s: string) => decodificar(semTags(s.replace(/&nbsp;/g, ' ')));

const dataIso = (br: string) => br.split('/').reverse().join('-');
const dataBr = (iso: string) => iso.split('-').reverse().join('/');

// Câmara Municipal tem consignação própria (servidores do Legislativo), fora do convênio da Prefeitura.
const VEICULOS_IGNORADOS = /c[âa]mara|cmsp/i;

export function parseResultados(html: string): ItemDiario[] {
  const itens: ItemDiario[] = [];
  for (const bloco of html.split('<div class="dadosDocumento">').slice(1)) {
    const doc = bloco.match(/Documento:\s*<\/span><a href="([^"]+md_epubli_visualizar[^"]+)"[^>]*>(\d+)<\/a>\s*<span>\s*-\s*([^<]*)<\/span>/);
    const data = bloco.match(/Publicado em (\d{2}\/\d{2}\/\d{4})/)?.[1];
    if (!doc || !data) continue;
    const veiculo = limpar(bloco.match(/<span class="veiculo">([\s\S]*?)<\/span>/)?.[1] ?? '');
    if (VEICULOS_IGNORADOS.test(veiculo)) continue;
    const orgao = limpar(bloco.match(/<span class="detalhesOrgao">[\s\S]*?<span class="tooltiptext">([\s\S]*?)<\/span>/)?.[1] ?? '');
    const assunto = limpar(bloco.match(/class="nroSei">[^<]*<\/a>\s*-\s*([\s\S]*?)<br/)?.[1] ?? '');
    const tipo = limpar(doc[3]);
    const trecho = limpar(bloco.match(/<p class="resumoDocumento">([\s\S]*?)<\/p>/)?.[1] ?? '').replace(/\s*\.\.\.\s*/g, ' ... ').trim();
    itens.push({
      id: doc[2],
      titulo: [tipo, assunto].filter(Boolean).join(' - '),
      orgao,
      dataIso: dataIso(data),
      link: decodificar(doc[1]).replace(/^http:\/\//, 'https://'),
      trecho,
    });
  }
  return itens;
}

// O portal decodifica o formulário como ISO-8859-1: acento em UTF-8 devolve "Erro realizando pesquisa".
export const latin1 = (s: string) =>
  [...Buffer.from(s, 'latin1')].map((b) => (/[A-Za-z0-9]/.test(String.fromCharCode(b)) ? String.fromCharCode(b) : `%${b.toString(16).toUpperCase().padStart(2, '0')}`)).join('');

async function buscarTermo(termo: string, desde: string, ate: string): Promise<ItemDiario[] | null> {
  const campos: Record<string, string> = {
    hdnTermoPesquisa: termo,
    hdnTipoPesquisa: 'E',
    hdnVersaoDiario: 'A',
    hdnOndePesquisa: 'C',
    hdnTipoDataPesquisa: 'P',
    hdnDataInicioPesquisa: dataBr(desde),
    hdnDataFimPesquisa: dataBr(ate),
    hdnVisualizacao: 'L',
    hdnModoPesquisa: 'AVANCADA',
  };
  const corpo = Object.entries(campos).map(([k, v]) => `${k}=${latin1(v)}`).join('&');
  try {
    const r = await fetch(URL_BUSCA, {
      method: 'POST',
      headers: { 'User-Agent': 'TeckPortfolio/1.0 (monitor de consignado)', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: corpo,
      next: { revalidate: REVALIDAR_SEGUNDOS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!r.ok) return null;
    const html = new TextDecoder('iso-8859-1').decode(await r.arrayBuffer());
    if (!html.includes('resultadobusca')) return null;
    return parseResultados(html);
  } catch {
    return null;
  }
}

// "consignado" sozinho é quase sempre o particípio ("fato consignado nesta ata"), não o crédito.
const CREDITO = /margem consign|consignat|empr[ée]stimo consignado|cr[ée]dito consignado|consigna[çc][ãa]o|desconto em folha/i;

export function converter(itens: ItemDiario[], desde: string): AtoOficial[] {
  const vistos = new Set<string>();
  const saida: AtoOficial[] = [];
  for (const it of itens) {
    if (it.dataIso < desde || vistos.has(it.id) || !CREDITO.test(`${it.titulo} ${it.trecho}`)) continue;
    const ato = paraAto(it, CONVENIOS, NOME);
    if (!ato) continue;
    vistos.add(it.id);
    saida.push(ato);
  }
  return saida.sort((a, b) => b.data.localeCompare(a.data));
}

export const fonteSPCap: FonteDiario = {
  id: 'spcap',
  nome: NOME,
  convenios: CONVENIOS,
  async buscar(periodo) {
    try {
      const desde = desdeDoPeriodo(periodo);
      const ate = new Date().toISOString().slice(0, 10);
      const respostas = await Promise.all(TERMOS.map((t) => buscarTermo(t, desde, ate)));
      if (respostas.every((r) => r === null)) return null;
      return converter(respostas.flatMap((r) => r ?? []), desde);
    } catch {
      return null;
    }
  },
};
