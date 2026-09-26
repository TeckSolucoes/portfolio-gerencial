import { desdeDoPeriodo, paraAto, semTags } from './tipos';
import type { FonteDiario, ItemDiario } from './tipos';
import type { AtoOficial } from '../diarioOficial';

// Imprensa Oficial / DOE-SP (doe.sp.gov.br). A busca do site é um SPA que chama esta API JSON pública.
// Cobre Executivo, Legislativo e municípios; aqui só o Executivo estadual interessa (ver filtros).
const API = 'https://do-api-web-search.doe.sp.gov.br/v2/advanced-search/publications';
const SITE = 'https://doe.sp.gov.br';
const REVALIDAR_SEGUNDOS = 3600;
const TIMEOUT_MS = 15000;
const PAGINAS_POR_TERMO = 3;
const POR_PAGINA = 100;

// A busca casa a palavra exata, com acento: cada flexão precisa ser pedida.
export const TERMOS = ['consignatária', 'consignatárias', 'consignação', 'consignações', 'margem consignável', 'empréstimo consignado'];

export interface PublicacaoSP {
  id?: string;
  date?: string;
  title?: string;
  slug?: string;
  excerpt?: string;
  hierarchy?: string;
}

interface RespostaSP {
  items?: PublicacaoSP[];
  hasNextPage?: boolean;
}

export function montarUrl(termo: string, pagina: number, desde: string, ate: string): string {
  const p = new URLSearchParams({
    'Terms[0]': termo,
    PageNumber: String(pagina),
    PageSize: String(POR_PAGINA),
    FromDate: desde,
    ToDate: ate,
  });
  return `${API}?${p.toString()}`;
}

// "consignado" solto aparece em "fica consignado", "termos consignados": só vale o vocabulário do crédito consignado.
const FORTE = /consignat[áa]ri|consigna[çc][ãõ]|margem consign|(empr[ée]stimo|cr[ée]dito|cart[ãa]o)\s+consignad|(coordenadoria|divis[ãa]o) de consignados/i;
// Extratos de contrato de processamento da folha (PMESP etc.), sem regra nova para o convênio.
const CONTRATO = /^\s*(contrato|termo|extrato)\b/i;
const CPF = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g;
// Avisos individuais da PM a devedores e extratos de contrato de processamento da folha: sem regra nova para o convênio.
const TITULO_RUIDO = /edital de notifica|edital diversos|consigna[çc][ãa]o em folha de pagamento pmesp/i;
const SPPREV = /spprev|s[ãa]o paulo previd[êe]ncia|previd[êe]ncia/i;

const CONVENIO_SPPREV = 'GOV SAO PAULO SPPREV';
const CONVENIO_ESTADO = 'GOV SÃO PAULO';

// Só Executivo estadual: municípios, MP, Legislativo, Jucesp e universidades não definem regra dos convênios estaduais.
export function ehExecutivoEstadual(hierarquia: string): boolean {
  if (!/^\s*Executivo\b/i.test(hierarquia)) return false;
  if (/minist[ée]rio p[úu]blico|universidade|atos de pessoal|munic[íi]pio|prefeitura/i.test(hierarquia)) return false;
  return true;
}

export function itensDe(resp: RespostaSP): ItemDiario[] {
  const saida: ItemDiario[] = [];
  for (const p of resp.items ?? []) {
    if (!p.id || !p.slug || !p.title || !p.date) continue;
    const hierarquia = p.hierarchy ?? '';
    if (!ehExecutivoEstadual(hierarquia)) continue;
    const trecho = semTags(p.excerpt ?? '').replace(CPF, '[cpf]');
    const assunto = trecho.match(/Assunto:\s*([^.]{5,90})/i)?.[1]?.trim();
    const titulo = assunto ? `${semTags(p.title)} - ${assunto}` : semTags(p.title);
    const ehDecreto = /decretos/i.test(hierarquia);
    if (!(FORTE.test(`${titulo} ${trecho}`) || (ehDecreto && /consign/i.test(trecho)))) continue;
    if (CONTRATO.test(trecho) || TITULO_RUIDO.test(titulo)) continue;
    const niveis = hierarquia.split('>').map((s) => s.trim());
    saida.push({
      id: p.id,
      titulo,
      orgao: niveis.slice(2, 4).join(' · '),
      dataIso: p.date.slice(0, 10),
      link: `${SITE}/${p.slug}`,
      trecho,
    });
  }
  return saida;
}

export function conveniosDe(item: ItemDiario): string[] {
  return SPPREV.test(`${item.orgao} ${item.titulo} ${item.trecho}`) ? [CONVENIO_SPPREV] : [CONVENIO_SPPREV, CONVENIO_ESTADO];
}

export function montarAtos(itens: ItemDiario[], desde: string, fonte = 'Diário Oficial do Estado de São Paulo'): AtoOficial[] {
  const vistos = new Set<string>();
  const atos: AtoOficial[] = [];
  for (const it of itens) {
    if (it.dataIso < desde || vistos.has(it.id)) continue;
    const ato = paraAto(it, conveniosDe(it), fonte);
    if (!ato) continue;
    vistos.add(it.id);
    atos.push(ato);
  }
  return atos.sort((a, b) => b.data.localeCompare(a.data));
}

// Devolve null se nenhuma página respondeu (fonte fora do ar); senão os itens já filtrados.
async function buscarTermo(termo: string, desde: string, ate: string): Promise<ItemDiario[] | null> {
  const itens: ItemDiario[] = [];
  let respondeu = false;
  for (let pagina = 1; pagina <= PAGINAS_POR_TERMO; pagina++) {
    try {
      const r = await fetch(montarUrl(termo, pagina, desde, ate), {
        headers: { 'User-Agent': 'teck-portfolio/1.0 (painel de consignado; leitura publica)', Accept: 'application/json' },
        next: { revalidate: REVALIDAR_SEGUNDOS },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!r.ok) break;
      const json = (await r.json()) as RespostaSP;
      respondeu = true;
      itens.push(...itensDe(json));
      if (!json.hasNextPage) break;
    } catch {
      break;
    }
  }
  return respondeu ? itens : null;
}

export const fonteSP: FonteDiario = {
  id: 'sp',
  nome: 'Diário Oficial do Estado de São Paulo',
  convenios: [CONVENIO_SPPREV, CONVENIO_ESTADO],
  async buscar(periodo) {
    try {
      const desde = desdeDoPeriodo(periodo);
      const ate = new Date().toISOString().slice(0, 10);
      const respostas = await Promise.all(TERMOS.map((t) => buscarTermo(t, desde, ate)));
      if (respostas.every((r) => r === null)) return null;
      return montarAtos(respostas.flatMap((r) => r ?? []), desde);
    } catch {
      return null;
    }
  },
};
