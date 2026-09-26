import { assuntosDe } from '../diarioOficial';
import type { AtoOficial } from '../diarioOficial';

// Cada diário estadual/municipal vira um adaptador que devolve ItemDiario[] (o que a fonte
// entregou, sem filtro) e usa paraAto() para aplicar o mesmo critério de relevância do DOU.
export interface ItemDiario {
  id: string; // estável e único dentro da fonte (ex.: id do ato ou URL)
  titulo: string;
  orgao: string; // secretaria/órgão emissor, se a fonte informar
  dataIso: string; // YYYY-MM-DD
  link: string; // https:// para o ato ou para a edição oficial
  trecho: string; // texto/ementa; sem HTML
}

export interface FonteDiario {
  id: string; // ex.: 'ma'
  nome: string; // ex.: 'Diário Oficial do Maranhão'
  convenios: string[]; // nomes exatos do convênio no Front que esta fonte cobre
  // null = fonte fora do ar/bloqueada; [] = respondeu sem ato relevante. Nunca lança.
  buscar: (periodo: 'semana' | 'mes' | 'ano') => Promise<AtoOficial[] | null>;
}

const RELEVANTE = /consign|margem consign|desconto em folha|consignat[áa]ri/i;
const RUIDO = /extrato de (contrato|dispensa)|aviso de licita|preg[ãa]o|licita[çc][ãa]o|\bata de registro/i;

// Só entra ato que fala de consignação; extratos e licitações ficam de fora.
export function paraAto(item: ItemDiario, convenios: string[], fonte: string): AtoOficial | null {
  if (!item.id || !item.titulo || !item.link.startsWith('https://')) return null;
  const base = `${item.titulo} ${item.trecho}`;
  if (!RELEVANTE.test(base) || RUIDO.test(item.titulo)) return null;
  return {
    id: `${fonte}:${item.id}`,
    titulo: item.titulo,
    orgao: item.orgao,
    data: item.dataIso,
    link: item.link,
    trecho: item.trecho,
    assuntos: assuntosDe(base),
    convenios,
    fonte,
    prioritario: true, // é o diário oficial do próprio ente do convênio
  };
}

export const semTags = (s: string) => s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

// Menor data aceita para cada período (referência = hoje, fuso de São Paulo não importa aqui).
export function desdeDoPeriodo(periodo: 'semana' | 'mes' | 'ano', hoje = new Date()): string {
  const d = new Date(hoje);
  d.setUTCDate(d.getUTCDate() - (periodo === 'semana' ? 7 : periodo === 'mes' ? 30 : 365));
  return d.toISOString().slice(0, 10);
}
