import type { AtoOficial } from '../diarioOficial';
import { desdeDoPeriodo, paraAto, semTags } from './tipos';
import type { FonteDiario, ItemDiario } from './tipos';

// DOEMA (diariooficial.ma.gov.br) não documenta API, mas o próprio site de busca consome
// `ajax.busca.php`, que devolve JSON com os fragmentos de página onde o termo aparece
// (texto extraído do PDF). Não há título de ato: cada resultado é uma página de uma edição.
const BASE = 'https://diariooficial.ma.gov.br';
const REVALIDAR_SEGUNDOS = 3600;
const TIMEOUT_MS = 20000;
const NOME = 'Diário Oficial do Maranhão';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
  Accept: 'application/json,text/plain,*/*',
  'Accept-Language': 'pt-BR,pt;q=0.9',
};

const TERMOS = [
  'margem consignável',
  'empréstimo consignado',
  'consignação em folha',
  'consignações facultativas',
  'consignatária',
  'desconto em folha',
];

// O caderno TERCEIROS mistura atos de prefeituras, câmaras, sindicatos e contratos: só
// entra o que fala de consignação do servidor e não é dotação/ata/ato municipal.
const FORTE =
  /margem consign|consigna[çc][ãõa]o?e?s? (em folha|facultativ)|empr[ée]stimo consignado|cr[ée]dito consignado|cart[ãa]o (de cr[ée]dito )?consignado|consignat[áa]ri[ao]s? (credenciad|habilitad|d[eao]s? )|desconto consignado|descontos? em folha/i;
const RUIDO_TRECHO =
  /ata de registro|registro de pre[çc]os|detentora\/\s*consignat|dota[çc][ãa]o or[çc]|c[âa]mara municipal|prefeitura|munic[íi]pio de|poder legislativo municipal|sindicato/i;

const ENTIDADES: Record<string, string> = { '&amp;': '&', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>' };
const limpar = (s: string) =>
  semTags(s)
    .replace(/&(amp|quot|lt|gt|#39);/g, (e) => ENTIDADES[e])
    .replace(/[\d*]{3}\.[\d*]{3}\.[\d*]{3}-[\d*]{2}|\*{3}[\d.\-*]*/g, '[doc]') // CPF, inclusive mascarado
    .replace(/\s+/g, ' ')
    .trim();

const dataIso = (br: string) => br.split('/').reverse().join('-');

// Extrai os cards do `es_html`; devolve [] para HTML que não tenha a forma esperada.
export function parseCards(esHtml: string): ItemDiario[] {
  const itens: ItemDiario[] = [];
  for (const card of esHtml.split(/<div class="card flex-md-row/).slice(1)) {
    const caderno = card.match(/text-primary">([^<]+)</)?.[1]?.trim();
    const data = card.match(/Publicado em (\d{2}\/\d{2}\/\d{4})/)?.[1];
    const trecho = card.match(/mb-auto">([\s\S]*?)<\/p>/)?.[1];
    const modal = card.match(/setModal\('[^']*','[^']*','([A-Z]{2}\d{8})','[^']*','(\d+)'/);
    if (!caderno || !data || !trecho || !modal) continue;
    const [, edicao, pagina] = modal;
    const texto = limpar(trecho).replace(/^\.\.\.\s*/, '');
    if (!texto) continue;
    itens.push({
      id: `${edicao}-p${pagina}-${hash(texto)}`,
      titulo: `${caderno} - pág. ${pagina}: ${texto.length > 110 ? `${texto.slice(0, 110).trimEnd()}...` : texto}`,
      orgao: `DOEMA - ${caderno}`,
      dataIso: dataIso(data),
      link: `${BASE}/download.php?arqv=1&arq=${edicao}#page=${pagina}`,
      trecho: texto,
    });
  }
  return itens;
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

// undefined = resposta inválida/erro da fonte; [] = respondeu sem resultado.
export function parseBusca(corpo: unknown): ItemDiario[] | undefined {
  const busca = (corpo as { busca?: { erro?: unknown; es_html?: unknown; total?: unknown } } | null)?.busca;
  if (!busca || busca.erro !== false) return undefined;
  if (typeof busca.es_html === 'string') return parseCards(busca.es_html);
  return busca.total === 0 ? [] : undefined;
}

export function relevante(item: ItemDiario): boolean {
  return FORTE.test(item.trecho) && !RUIDO_TRECHO.test(item.trecho);
}

export function montarAtos(itens: ItemDiario[], desde: string): AtoOficial[] {
  const vistos = new Set<string>();
  const saida: AtoOficial[] = [];
  for (const item of itens) {
    if (item.dataIso < desde || vistos.has(item.id) || !relevante(item)) continue;
    const ato = paraAto(item, ['GOV MARANHÃO'], NOME);
    if (!ato) continue;
    vistos.add(item.id);
    saida.push(ato);
  }
  return saida.sort((a, b) => b.data.localeCompare(a.data));
}

async function consultar(termo: string, desde: string, ate: string): Promise<ItemDiario[] | undefined> {
  const url = `${BASE}/ajax.busca.php?termo=${encodeURIComponent(termo)}&datai=${desde}&dataf=${ate}`;
  try {
    const r = await fetch(url, {
      headers: HEADERS,
      next: { revalidate: REVALIDAR_SEGUNDOS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!r.ok) return undefined;
    return parseBusca(await r.json());
  } catch {
    return undefined;
  }
}

async function buscar(periodo: 'semana' | 'mes' | 'ano'): Promise<AtoOficial[] | null> {
  const desde = desdeDoPeriodo(periodo);
  const ate = new Date().toISOString().slice(0, 10);
  const respostas = await Promise.all(TERMOS.map((t) => consultar(t, desde, ate)));
  if (respostas.every((r) => r === undefined)) return null;
  return montarAtos(respostas.flatMap((r) => r ?? []), desde);
}

export const fonteMA: FonteDiario = {
  id: 'ma',
  nome: NOME,
  convenios: ['GOV MARANHÃO'],
  buscar,
};
