import { atosDoDiarioOficial } from '../diarioOficial';
import type { AtoOficial } from '../diarioOficial';
import type { FonteDiario } from './tipos';
import { fonteMA } from './ma';
import { fonteImperatriz } from './imperatriz';
import { fonteMG } from './mg';
import { fontePB } from './pb';
import { fonteSP } from './sp';
import { fonteSPCap } from './spcap';
import { fonteTO } from './to';

export const FONTES: FonteDiario[] = [fonteMA, fonteTO, fonteSP, fontePB, fonteMG, fonteSPCap, fonteImperatriz];

// O que cada fonte realmente entrega. Mostrado na tela para ninguém tratar pista como ato.
export const COBERTURA: Record<string, string> = {
  dou: 'Federal (INSS, SIAPE/Gestão, CNPS, Banco Central): ato com título e órgão.',
  ma: 'Texto integral dos PDFs; sem título de ato, só o trecho da página.',
  to: 'Por edição do diário: diz em quais edições o termo aparece, sem trecho. Abrir o PDF para achar o ato.',
  sp: 'Estado de SP: API oficial, com trecho de ~200 caracteres do ato.',
  pb: 'Parcial: o diário não tem busca; vem pelo Google Notícias. É pista para abrir o PDF, não ato classificado.',
  mg: 'Trecho de ~200 caracteres por página; sem título nem link direto para o ato.',
  imperatriz: 'Imperatriz-MA: busca nos PDFs por edição; lenta, e a fonte que estourar o tempo aparece como indisponível.',
  spcap: 'Cidade de SP: portal oficial, só a 1ª página de resultados por termo (no ano, cobertura parcial).',
};

// Uma fonte lenta (Imperatriz chega a 60 s) não pode segurar a tela: passou do limite, conta como
// indisponível naquela consulta e as outras seguem.
export const LIMITE_POR_FONTE_MS = 12_000;

const comLimite = <T,>(p: Promise<T | null>, ms: number): Promise<T | null> =>
  Promise.race([p.catch(() => null), new Promise<null>((ok) => setTimeout(() => ok(null), ms))]);

export interface StatusFonte {
  id: string;
  nome: string;
  situacao: 'ok' | 'indisponivel';
  qtd: number;
  cobertura: string;
}

export interface Consolidado {
  atos: AtoOficial[];
  fontes: StatusFonte[];
}

// Cada fonte falha sozinha: uma fora do ar não derruba as outras. atos = [] com todas
// indisponíveis é distinguível pelo status (ninguém confunde "sem ato" com "sem resposta").
async function consultar(periodo: 'semana' | 'mes' | 'ano'): Promise<Consolidado> {
  const [dou, ...estaduais] = await Promise.all([atosDoDiarioOficial(periodo), ...FONTES.map((f) => comLimite(f.buscar(periodo), LIMITE_POR_FONTE_MS))]);

  const resultados: { id: string; nome: string; atos: AtoOficial[] | null }[] = [
    { id: 'dou', nome: 'Diário Oficial da União', atos: dou },
    ...FONTES.map((f, i) => ({ id: f.id, nome: f.nome, atos: estaduais[i] })),
  ];

  const vistos = new Set<string>();
  const atos = resultados
    .flatMap((r) => r.atos ?? [])
    .filter((a) => (vistos.has(a.id) ? false : (vistos.add(a.id), true)))
    .sort((a, b) => Number(b.prioritario) - Number(a.prioritario) || b.data.localeCompare(a.data));

  return {
    atos,
    fontes: resultados.map((r) => ({
      id: r.id,
      nome: r.nome,
      situacao: r.atos === null ? 'indisponivel' : 'ok',
      qtd: r.atos?.length ?? 0,
      cobertura: COBERTURA[r.id] ?? '',
    })),
  };
}

// O container é de vida longa, então dá para guardar o resultado em memória: a 1ª consulta após o
// boot espera as fontes (a mais lenta define o tempo); depois a tela responde na hora e a
// atualização roda em segundo plano quando o resultado passa de 30 minutos.
const VALIDADE_MS = 30 * 60 * 1000;
const cache = new Map<string, { em: number; valor: Consolidado; atualizando: boolean }>();

export async function atosConsolidados(periodo: 'semana' | 'mes' | 'ano'): Promise<Consolidado> {
  const guardado = cache.get(periodo);
  if (guardado) {
    if (Date.now() - guardado.em > VALIDADE_MS && !guardado.atualizando) {
      guardado.atualizando = true;
      consultar(periodo)
        .then((valor) => cache.set(periodo, { em: Date.now(), valor, atualizando: false }))
        .catch(() => {
          guardado.atualizando = false;
        });
    }
    return guardado.valor;
  }
  const valor = await consultar(periodo);
  cache.set(periodo, { em: Date.now(), valor, atualizando: false });
  return valor;
}
