import { desdeDoPeriodo, paraAto, semTags } from './tipos';
import type { FonteDiario, ItemDiario } from './tipos';
import type { AtoOficial } from '../diarioOficial';

// Cobertura PARCIAL. O Diário Oficial da PB (auniao.pb.gov.br/doe) publica cada edição como um PDF
// único e o portal (Plone) não tem busca por texto nem API/RSS dentro dos PDFs. A alternativa viável
// é o Google Notícias restrito ao domínio: ele indexa os PDFs, mas devolve a edição inteira (título
// genérico, sem ementa), então cada item significa "esta edição menciona o termo", não "este ato".
const NOME = 'Diário Oficial da Paraíba';
const FONTE = `${NOME} (via Google Notícias)`;
const CONVENIOS = ['GOV PARAÍBA'];
const TERMOS = ['consignado', 'consignação', 'margem consignável'];
const REVALIDAR_SEGUNDOS = 3600;
const TIMEOUT_MS = 15000;
const JANELA = { semana: '7d', mes: '30d', ano: '365d' } as const;

export const urlBusca = (termo: string, periodo: 'semana' | 'mes' | 'ano') =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(`${termo} site:auniao.pb.gov.br when:${JANELA[periodo]}`)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;

const decodificar = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

const tag = (bloco: string, nome: string) => {
  const m = bloco.match(new RegExp(`<${nome}[^>]*>([\\s\\S]*?)</${nome}>`));
  return m ? decodificar(m[1].replace(/^<!\[CDATA\[|\]\]>$/g, '')) : '';
};

// Edições vêm como "Diário Oficial 03-06-2026 Eduardo.indd"; nos demais casos vale a data de indexação.
export function dataDaEdicao(titulo: string, pubDate: string): string {
  const m = titulo.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(pubDate);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

export function parseRss(xml: string, termo: string): ItemDiario[] {
  const itens: ItemDiario[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const bloco = m[1];
    const guid = tag(bloco, 'guid');
    const link = tag(bloco, 'link').trim();
    const rotulo = semTags(tag(bloco, 'title')).replace(/\s+-\s+A Uni[ãa]o$/i, '');
    const dataIso = dataDaEdicao(rotulo, tag(bloco, 'pubDate'));
    if (!guid || !link || !dataIso) continue;
    const [a, mes, d] = dataIso.split('-');
    itens.push({
      id: guid,
      titulo: `Diário Oficial da Paraíba de ${d}/${mes}/${a}: ${rotulo.replace(/\.indd$/i, '')}`,
      orgao: 'Governo da Paraíba',
      dataIso,
      link,
      trecho: `Edição indexada para a busca "${termo}". A menção pode estar em qualquer ato da edição; confira o PDF.`,
    });
  }
  return itens;
}

async function buscarTermo(termo: string, periodo: 'semana' | 'mes' | 'ano'): Promise<ItemDiario[] | null> {
  try {
    const r = await fetch(urlBusca(termo, periodo), {
      headers: { 'User-Agent': 'Mozilla/5.0 (painel-executivo)' },
      next: { revalidate: REVALIDAR_SEGUNDOS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!r.ok) return null;
    const xml = await r.text();
    if (!xml.includes('<rss')) return null;
    return parseRss(xml, termo);
  } catch {
    return null;
  }
}

export function consolidar(itens: ItemDiario[], periodo: 'semana' | 'mes' | 'ano', hoje = new Date()): AtoOficial[] {
  const desde = desdeDoPeriodo(periodo, hoje);
  const vistos = new Set<string>();
  const atos: AtoOficial[] = [];
  for (const item of itens) {
    if (item.dataIso < desde || vistos.has(item.id)) continue;
    const ato = paraAto(item, CONVENIOS, FONTE);
    if (!ato) continue;
    vistos.add(item.id);
    atos.push(ato);
  }
  return atos.sort((a, b) => b.data.localeCompare(a.data));
}

export const fontePB: FonteDiario = {
  id: 'pb',
  nome: NOME,
  convenios: CONVENIOS,
  async buscar(periodo) {
    const respostas = await Promise.all(TERMOS.map((t) => buscarTermo(t, periodo)));
    if (respostas.every((r) => r === null)) return null;
    return consolidar(respostas.flatMap((r) => r ?? []), periodo);
  },
};
