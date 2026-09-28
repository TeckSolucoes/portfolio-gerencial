import type { AtoOficial } from '../diarioOficial';
import { desdeDoPeriodo, paraAto, semTags } from './tipos';
import type { FonteDiario, ItemDiario } from './tipos';

// Diário Oficial Eletrônico de Imperatriz (diariooficial.imperatriz.ma.gov.br, robots.txt sem restrições).
// Só publica edições em PDF, mas a página /publicacoes tem busca de texto integral nos PDFs
// (POST /publicacoes-buscar, protegido por token CSRF da própria página) que devolve, por edição,
// um trecho onde o termo aparece. A busca é lenta (varre PDFs), por isso poucas consultas e cache em memória.
// O Querido Diário não cobre Imperatriz (availability_date vazio) e a api.queridodiario.ok.org.br
// falha no handshake TLS a partir daqui; por isso não é usado.
const BASE = 'https://diariooficial.imperatriz.ma.gov.br';
const TIMEOUT_MS = 60000;
const CACHE_MS = 3600 * 1000;
const NOME = 'Diário Oficial de Imperatriz';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36';

// A busca é por substring; "consignado" já pega "consignados".
const TERMOS = ['consignado', 'consignatári', 'margem consign', 'desconto em folha'];

// "consignar/consignados apontamentos/dotações consignadas" são verbo/orçamento, não consignado em folha.
const CONSIGNACAO_DE_FOLHA =
  /(empr[ée]stimos?|cr[ée]ditos?|cart[ãa]o)\s+(de\s+)?consignad|consignad[oa]s?\s+em\s+folha|consigna[çc][õo]e?s?\s+em\s+folha|consignat[áa]ri|margem\s+consign|descontos?\s+em\s+folha/i;

const CPF = /\d{3}\.[\d*]{3}\.[\d*]{3}-[\d*]{2}/g;

const dataIso = (br: string) => br.split('/').reverse().join('-');
const dataBr = (d: Date) =>
  `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;

export function extrairToken(html: string): string | null {
  return html.match(/name="_token"\s+value="([^"]+)"/)?.[1] ?? null;
}

// A resposta traz duas tabelas: publicações por título e "Resultados encontrados nos Diários Oficiais (PDF)".
// Só a segunda tem trecho de texto, e é a que interessa.
export function parseResultadosPdf(html: string): ItemDiario[] {
  const i = html.indexOf('Resultados encontrados nos Di');
  if (i < 0) return [];
  const itens: ItemDiario[] = [];
  const linhas = html.slice(i).matchAll(/<tr>\s*<td>(\d+)<\/td>\s*<td>(\d{2}\/\d{2}\/\d{4})<\/td>\s*<td>([^<]*)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/g);
  for (const [, edicao, data, titulo, trecho, arquivo] of linhas) {
    const link = arquivo.match(/href="(https:\/\/[^"]+\.pdf)"/i)?.[1];
    if (!link) continue;
    itens.push({
      id: edicao,
      titulo: semTags(titulo),
      orgao: 'Prefeitura Municipal de Imperatriz',
      dataIso: dataIso(data),
      link,
      trecho: semTags(trecho).replace(CPF, '[CPF omitido]'),
    });
  }
  return itens;
}

export function montarAtos(itens: ItemDiario[], desde: string, convenios: string[], fonte = NOME): AtoOficial[] {
  const vistos = new Set<string>();
  const saida: AtoOficial[] = [];
  for (const it of itens) {
    if (it.dataIso < desde || !CONSIGNACAO_DE_FOLHA.test(it.trecho)) continue;
    const ato = paraAto(it, convenios, fonte);
    if (!ato || vistos.has(ato.id)) continue;
    vistos.add(ato.id);
    saida.push(ato);
  }
  return saida.sort((a, b) => b.data.localeCompare(a.data));
}

const CONVENIOS = ['PREF IMPERATRIZ MA'];
const cache = new Map<string, { em: number; atos: AtoOficial[] }>();

async function consultar(termos: string[], de: string, ate: string): Promise<ItemDiario[] | null> {
  const headers = { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'pt-BR,pt;q=0.9' };
  const pagina = await fetch(`${BASE}/publicacoes`, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!pagina.ok) return null;
  const cookie = pagina.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  const token = extrairToken(await pagina.text());
  if (!token) return null;

  const respostas = await Promise.all(
    termos.map(async (descricao) => {
      try {
        const r = await fetch(`${BASE}/publicacoes-buscar`, {
          method: 'POST',
          headers: { ...headers, cookie, 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ _token: token, de, ate, secretaria_id: '', descricao }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!r.ok) return null;
        const html = await r.text();
        return html.includes('id="example"') ? parseResultadosPdf(html) : null; // sem a tabela = página inesperada
      } catch {
        return null;
      }
    }),
  );
  if (respostas.every((r) => r === null)) return null;
  return respostas.flatMap((r) => r ?? []);
}

async function buscar(periodo: 'semana' | 'mes' | 'ano'): Promise<AtoOficial[] | null> {
  const em = cache.get(periodo);
  if (em && Date.now() - em.em < CACHE_MS) return em.atos;
  try {
    const desde = desdeDoPeriodo(periodo);
    const itens = await consultar(TERMOS, dataBr(new Date(`${desde}T00:00:00Z`)), dataBr(new Date()));
    if (!itens) return null;
    const atos = montarAtos(itens, desde, CONVENIOS);
    cache.set(periodo, { em: Date.now(), atos });
    return atos;
  } catch {
    return null;
  }
}

export const fonteImperatriz: FonteDiario = {
  id: 'imperatriz',
  nome: NOME,
  convenios: CONVENIOS,
  buscar,
};
