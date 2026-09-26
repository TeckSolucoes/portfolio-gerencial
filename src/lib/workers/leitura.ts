import 'server-only';
import { desdeDoPeriodo } from '../diarios/tipos';
import { atosConsolidados, COBERTURA, FONTES } from '../diarios';
import type { Consolidado, StatusFonte } from '../diarios';
import type { AtoOficial } from '../diarioOficial';
import { ibovespa, indicadores, noticias } from '../mercado';
import type { Cotacao, Indicador, Noticia } from '../mercado';
import { lerCache } from './cache';
import { TOPICOS_NOTICIAS } from './registro';

// As telas leem o que os workers coletaram. Sem cache ainda (1º boot, ou arquivo apagado), caem na
// consulta ao vivo, que é como funcionava antes: nada quebra enquanto o worker não rodou.

export async function bolsaAtual(): Promise<Cotacao | null> {
  const c = await lerCache<Cotacao & { em: string }>('mercado-bolsa');
  return c ? { ...c.dados, em: new Date(c.dados.em) } : ibovespa();
}

export async function indicadoresAtuais(): Promise<Indicador[]> {
  const c = await lerCache<Indicador[]>('mercado-bcb');
  return c ? c.dados : indicadores();
}

export async function noticiasDoTopico(consulta: string, limite = 5): Promise<Noticia[] | null> {
  const topico = TOPICOS_NOTICIAS.find((t) => t.consulta === consulta);
  const c = topico ? await lerCache<(Omit<Noticia, 'publicadaEm'> & { publicadaEm: string | null })[]>(`noticias-${topico.id}`) : null;
  if (!c) return noticias(consulta, limite);
  return c.dados.slice(0, limite).map((n) => ({ ...n, publicadaEm: n.publicadaEm ? new Date(n.publicadaEm) : null }));
}

const NOME_DOU = 'Diário Oficial da União';

export async function atosDoCache(periodo: 'semana' | 'mes' | 'ano'): Promise<Consolidado> {
  const fontes = [{ id: 'dou', nome: NOME_DOU }, ...FONTES.map((f) => ({ id: f.id, nome: f.nome }))];
  const caches = await Promise.all(fontes.map((f) => lerCache<AtoOficial[]>(`diario-${f.id}`)));
  if (caches.every((c) => c === null)) return atosConsolidados(periodo);

  const desde = desdeDoPeriodo(periodo);
  const vistos = new Set<string>();
  const atos: AtoOficial[] = [];
  const status: StatusFonte[] = fontes.map((f, i) => {
    const c = caches[i];
    const doPeriodo = (c?.dados ?? []).filter((a) => a.data >= desde);
    for (const a of doPeriodo) {
      if (vistos.has(a.id)) continue;
      vistos.add(a.id);
      atos.push(a);
    }
    return { id: f.id, nome: f.nome, situacao: c ? 'ok' : 'indisponivel', qtd: doPeriodo.length, cobertura: COBERTURA[f.id] ?? '' };
  });
  atos.sort((a, b) => Number(b.prioritario) - Number(a.prioritario) || b.data.localeCompare(a.data));
  return { atos, fontes: status };
}
