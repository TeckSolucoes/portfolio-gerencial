// Dados públicos para a home. Toda função devolve null quando a fonte falha: a tela mostra
// "indisponível" em vez de inventar número ou reaproveitar valor antigo.

const REVALIDAR_SEGUNDOS = 900;
const TIMEOUT_MS = 8000;

async function buscar(url: string): Promise<Response | null> {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (painel-executivo)' },
      next: { revalidate: REVALIDAR_SEGUNDOS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return r.ok ? r : null;
  } catch {
    return null;
  }
}

export interface Cotacao {
  pontos: number;
  variacaoPct: number | null;
  em: Date;
}

// Yahoo Finance: endpoint público não oficial. Se mudar ou bloquear, cai em null.
export async function ibovespa(): Promise<Cotacao | null> {
  const r = await buscar('https://query1.finance.yahoo.com/v8/finance/chart/%5EBVSP?range=1d&interval=5m');
  if (!r) return null;
  try {
    const meta = (await r.json())?.chart?.result?.[0]?.meta;
    const pontos = Number(meta?.regularMarketPrice);
    if (!Number.isFinite(pontos)) return null;
    const anterior = Number(meta?.chartPreviousClose ?? meta?.previousClose);
    const variacao = Number.isFinite(anterior) && anterior > 0 ? ((pontos - anterior) / anterior) * 100 : null;
    return { pontos, variacaoPct: variacao, em: new Date(Number(meta.regularMarketTime) * 1000) };
  } catch {
    return null;
  }
}

export interface Indicador {
  rotulo: string;
  valor: number;
  unidade: string;
  data: string; // dd/mm/aaaa, como o Banco Central publica
}

// Séries do SGS/Banco Central: 432 = meta Selic (% a.a.), 4389 = CDI (% a.a.), 433 = IPCA (% no mês).
const SERIES: { codigo: number; rotulo: string; unidade: string }[] = [
  { codigo: 432, rotulo: 'Selic (meta)', unidade: '% a.a.' },
  { codigo: 4389, rotulo: 'CDI', unidade: '% a.a.' },
  { codigo: 433, rotulo: 'IPCA', unidade: '% no mês' },
];

type LinhaBcb = { data?: unknown; valor?: unknown };

const hojeSaoPaulo = (agora: Date) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(agora);

const dataBcbIso = (valor: unknown): string | null => {
  const partes = String(valor ?? '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return partes ? `${partes[3]}-${partes[2]}-${partes[1]}` : null;
};

export function ultimoIndicadorValido(linhas: LinhaBcb[], agora = new Date()): LinhaBcb | null {
  const hoje = hojeSaoPaulo(agora);
  return [...linhas]
    .filter((linha) => {
      const data = dataBcbIso(linha.data);
      return data !== null && data <= hoje && Number.isFinite(Number(linha.valor));
    })
    .sort((a, b) => dataBcbIso(b.data)!.localeCompare(dataBcbIso(a.data)!))[0] ?? null;
}

export async function indicadores(): Promise<Indicador[]> {
  const linhas = await Promise.all(
    SERIES.map(async (s) => {
      const r = await buscar(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${s.codigo}/dados/ultimos/10?formato=json`);
      if (!r) return null;
      try {
        const ultimo = ultimoIndicadorValido((await r.json()) ?? []);
        const valor = Number(ultimo?.valor);
        return ultimo && Number.isFinite(valor) ? { rotulo: s.rotulo, valor, unidade: s.unidade, data: String(ultimo.data) } : null;
      } catch {
        return null;
      }
    }),
  );
  return linhas.filter((l): l is Indicador => l !== null);
}

export interface Noticia {
  titulo: string;
  fonte: string;
  link: string;
  publicadaEm: Date | null;
}

const entidades: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'" };
const decodificar = (s: string) =>
  s
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&(amp|lt|gt|quot|apos|#39);/g, (m) => entidades[m])
    .trim();
const campo = (bloco: string, tag: string) => decodificar(bloco.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1] ?? '');

// Google Notícias (RSS público). O título vem como "Manchete - Veículo"; o veículo sai do título.
export async function noticias(consulta: string, limite = 5): Promise<Noticia[] | null> {
  const r = await buscar(
    `https://news.google.com/rss/search?q=${encodeURIComponent(consulta)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`,
  );
  if (!r) return null;
  const itens = (await r.text()).match(/<item>[\s\S]*?<\/item>/g) ?? [];
  const lista = itens.map((bloco): Noticia | null => {
    const fonte = campo(bloco, 'source');
    let titulo = campo(bloco, 'title');
    if (fonte && titulo.endsWith(` - ${fonte}`)) titulo = titulo.slice(0, -(fonte.length + 3));
    const link = campo(bloco, 'link');
    if (!titulo || !link.startsWith('https://')) return null;
    const data = new Date(campo(bloco, 'pubDate'));
    return { titulo, fonte, link, publicadaEm: Number.isNaN(data.getTime()) ? null : data };
  });
  return lista.filter((n): n is Noticia => n !== null).slice(0, limite);
}
