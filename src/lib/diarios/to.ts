import type { AtoOficial } from '../diarioOficial';
import { paraAto, desdeDoPeriodo, semTags } from './tipos';
import type { FonteDiario, ItemDiario } from './tipos';

// A busca pública (diariooficial.to.gov.br/busca) é full-text nos PDFs, mas devolve só a EDIÇÃO
// que contém o termo (número, data, páginas, link do PDF), sem trecho. Cobertura de edição, não de ato.
const BASE = 'https://diariooficial.to.gov.br/busca';
const REVALIDAR_SEGUNDOS = 3600;
const TIMEOUT_MS = 15000;
const NOME = 'Diário Oficial do Tocantins';
const CONVENIOS = ['GOV TOCANTINS IGEPREV'];
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'pt-BR,pt;q=0.9',
};

// "consignado" e "consignação" sozinhos casam com quase toda edição (ruído); só frases específicas.
const TERMOS = [
  'margem consignável',
  'consignatária',
  'consignatárias',
  'consignações',
  'crédito consignado',
  'empréstimo consignado',
  'desconto em folha',
];

export interface EdicaoTO {
  docId: string;
  numero: string;
  dataIso: string;
  paginas: string;
  link: string;
}

export function extrairEdicoes(html: string): EdicaoTO[] | null {
  if (!html.includes('Resultados da busca')) return null;
  const corpo = html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? '';
  const saida: EdicaoTO[] = [];
  for (const [, tr] of corpo.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const numero = tr.match(/<td>\s*N[ºo°]\s*(\d+)\s*<\/td>/)?.[1];
    const data = tr.match(/<td>\s*(\d{2})\/(\d{2})\/(\d{4})\s*<\/td>/);
    const link = tr.match(/href="(https:\/\/doe\.to\.gov\.br\/diario\/(\d+)\/download)"/);
    if (!numero || !data || !link) continue;
    const paginas = semTags(tr.match(/<td>\s*(\d+)\s*p[áa]g\.?\s*<\/td>/)?.[1] ?? '');
    saida.push({ docId: link[2], numero, dataIso: `${data[3]}-${data[2]}-${data[1]}`, paginas, link: link[1] });
  }
  return saida;
}

export function edicoesParaItens(porTermo: Map<string, EdicaoTO[]>): ItemDiario[] {
  const agregado = new Map<string, { ed: EdicaoTO; termos: string[] }>();
  for (const [termo, edicoes] of porTermo) {
    for (const ed of edicoes) {
      const atual = agregado.get(ed.docId);
      if (atual) atual.termos.push(termo);
      else agregado.set(ed.docId, { ed, termos: [termo] });
    }
  }
  return [...agregado.values()].map(({ ed, termos }) => ({
    id: ed.docId,
    titulo: `Edição nº ${ed.numero} do Diário Oficial do Tocantins`,
    orgao: 'Estado do Tocantins',
    dataIso: ed.dataIso,
    link: ed.link,
    trecho: `Edição${ed.paginas ? ` de ${ed.paginas} páginas` : ''} contém: ${termos.join(', ')}. A busca do diário não mostra o trecho; abrir o PDF para localizar o ato.`,
  }));
}

export function montarAtos(porTermo: Map<string, EdicaoTO[]>, periodo: 'semana' | 'mes' | 'ano', hoje = new Date()): AtoOficial[] {
  const desde = desdeDoPeriodo(periodo, hoje);
  return edicoesParaItens(porTermo)
    .filter((i) => i.dataIso >= desde)
    .map((i) => paraAto(i, CONVENIOS, NOME))
    .filter((a): a is AtoOficial => a !== null)
    .sort((a, b) => b.data.localeCompare(a.data));
}

async function buscarTermo(termo: string, desde: string, ate: string): Promise<EdicaoTO[] | null> {
  const url = `${BASE}?por=texto&texto=${encodeURIComponent(termo)}&data-inicial=${desde}&data-final=${ate}`;
  try {
    const r = await fetch(url, {
      headers: HEADERS,
      next: { revalidate: REVALIDAR_SEGUNDOS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!r.ok) return null;
    return extrairEdicoes(await r.text());
  } catch {
    return null;
  }
}

export const fonteTO: FonteDiario = {
  id: 'to',
  nome: NOME,
  convenios: CONVENIOS,
  async buscar(periodo) {
    try {
      const hoje = new Date();
      const desde = desdeDoPeriodo(periodo, hoje);
      const ate = hoje.toISOString().slice(0, 10);
      const respostas = await Promise.all(TERMOS.map((t) => buscarTermo(t, desde, ate)));
      if (respostas.every((r) => r === null)) return null;
      const porTermo = new Map<string, EdicaoTO[]>();
      TERMOS.forEach((t, i) => porTermo.set(t, respostas[i] ?? []));
      return montarAtos(porTermo, periodo, hoje);
    } catch {
      return null;
    }
  },
};
