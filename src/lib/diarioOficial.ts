// Atos do Diário Oficial da União que mexem em regras, margens, juros e habilitação do consignado.
// Fonte: busca pública da Imprensa Nacional (in.gov.br), que entrega os resultados em JSON dentro
// da página. Diários estaduais e municipais NÃO estão aqui (cada um tem fonte própria).
// Cada item leva o link oficial: o portal indica onde olhar, não substitui a leitura do ato.

const REVALIDAR_SEGUNDOS = 3600;
const TIMEOUT_MS = 15000;

// A busca do DOU não aceita bem frases entre aspas: termos simples e filtro depois.
const CONSULTAS = ['consignado', 'consignados', 'consignação', 'margem consignavel'];

export type Assunto = 'Margem' | 'Juros e taxas' | 'Prazo e parcelas' | 'Habilitação e convênio' | 'Suspensão e vedação' | 'Cartão' | 'Portabilidade';

export interface AtoOficial {
  id: string;
  titulo: string;
  orgao: string;
  data: string; // YYYY-MM-DD
  link: string;
  trecho: string;
  assuntos: Assunto[];
  convenios: string[]; // convênios nossos que o ato afeta (INSS, SIAPE, GOV MARANHÃO...)
  fonte?: string; // diário de origem quando não é o DOU (ex.: 'Diário Oficial do Maranhão')
  prioritario: boolean; // órgão que define regra de convênio que operamos (INSS, CNPS, Gestão, BC/CMN)
}

interface ItemBruto {
  urlTitle?: string;
  title?: string;
  pubDate?: string;
  content?: string;
  hierarchyStr?: string;
}

const semMarcacao = (s: string) =>
  s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

const TIPOS_QUE_INTERESSAM = /^\s*(instru[çc][ãa]o normativa|portaria|resolu[çc][ãa]o|decreto|lei\b|medida provis[óo]ria|circular|despacho|ato\b|nota t[ée]cnica|orienta[çc][ãa]o)/i;
const RUIDO = /extrato|aviso de|contrato|licita[çc]|preg[ãa]o|termo (aditivo|de)|dispensa|ata de|credenciamento n/i;

// Atos internos de tribunais, casas legislativas e MP tratam de consignação dos próprios servidores.
const ORGAOS_IGNORADOS = /poder judici|tribunal|justi[çc]a (federal|do trabalho|eleitoral)|poder legislativo|c[âa]mara|senado|minist[ée]rio p[úu]blico|defensoria/i;

const ORGAOS_PRIORITARIOS =
  /previd[êe]ncia|inss|instituto nacional do seguro|conselho nacional de previd|banco central|conselho monet|gest[ãa]o e da inova|minist[ée]rio da gest|caixa econ[ôo]mica/i;

// Convênios federais que operamos e o órgão que define as regras deles.
const CONVENIOS_POR_ORGAO: [string, RegExp][] = [
  ['INSS', /inss|previd[êe]ncia|instituto nacional do seguro/i],
  ['SIAPE', /gest[ãa]o e da inova|mgi|siape|servidores federais/i],
];

const ASSUNTOS: [Assunto, RegExp][] = [
  ['Margem', /margem/i],
  ['Juros e taxas', /\bjuros\b|\btaxas?\b|\bcet\b|teto/i],
  ['Prazo e parcelas', /\bprazos?\b|parcelas?|\bcarência\b/i],
  ['Habilitação e convênio', /conv[êe]nio|habilita|credenciamento|cadastr|consignat[áa]ria|averba/i],
  ['Suspensão e vedação', /suspen|bloque|vedad|veda[çc]|cancelamento d[ea] (conv|habilit)/i],
  ['Cartão', /cart[ãa]o/i],
  ['Portabilidade', /portabilidade|refinanciamento/i],
];

export const assuntosDe = (texto: string): Assunto[] => ASSUNTOS.filter(([, re]) => re.test(texto)).map(([a]) => a);

const dataIso = (br: string) => br.split('/').reverse().join('-');

export function classificar(itens: ItemBruto[]): AtoOficial[] {
  const vistos = new Set<string>();
  const saida: AtoOficial[] = [];
  for (const it of itens) {
    const id = it.urlTitle;
    const titulo = semMarcacao(it.title ?? '');
    const trecho = semMarcacao(it.content ?? '');
    if (!id || !titulo || vistos.has(id)) continue;
    if (!TIPOS_QUE_INTERESSAM.test(titulo) || RUIDO.test(titulo)) continue;
    if (!/consign/i.test(`${titulo} ${trecho}`)) continue;
    const orgao = semMarcacao(it.hierarchyStr ?? '').split('/').slice(0, 2).join(' · ');
    if (ORGAOS_IGNORADOS.test(orgao)) continue;
    vistos.add(id);
    const base = `${titulo} ${trecho}`;
    saida.push({
      id,
      titulo,
      orgao,
      data: dataIso(it.pubDate ?? ''),
      link: `https://www.in.gov.br/web/dou/-/${id}`,
      trecho,
      assuntos: ASSUNTOS.filter(([, re]) => re.test(base)).map(([a]) => a),
      convenios: CONVENIOS_POR_ORGAO.filter(([, re]) => re.test(`${orgao} ${titulo}`)).map(([c]) => c),
      prioritario: ORGAOS_PRIORITARIOS.test(orgao),
    });
  }
  return saida.sort((a, b) => Number(b.prioritario) - Number(a.prioritario) || b.data.localeCompare(a.data));
}

async function buscar(termo: string, periodo: 'semana' | 'mes' | 'ano'): Promise<ItemBruto[]> {
  const url = `https://www.in.gov.br/consulta/-/buscar/dou?q=${encodeURIComponent(termo)}&s=todos&exactDate=${periodo}&sortType=1&delta=20`;
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (painel-executivo)' },
      next: { revalidate: REVALIDAR_SEGUNDOS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!r.ok) return [];
    const html = new TextDecoder('utf-8').decode(await r.arrayBuffer());
    const json = html.match(/BuscaDouPortlet_params"[^>]*>\s*(\{[\s\S]*?\})\s*<\/script>/)?.[1];
    return json ? ((JSON.parse(json).jsonArray as ItemBruto[]) ?? []) : [];
  } catch {
    return [];
  }
}

// null quando a fonte inteira falhou (a tela mostra "indisponível"); [] quando respondeu sem ato relevante.
export async function atosDoDiarioOficial(periodo: 'semana' | 'mes' | 'ano' = 'mes'): Promise<AtoOficial[] | null> {
  const respostas = await Promise.all(CONSULTAS.map((c) => buscar(c, periodo)));
  if (respostas.every((r) => r.length === 0)) return null;
  return classificar(respostas.flat());
}
