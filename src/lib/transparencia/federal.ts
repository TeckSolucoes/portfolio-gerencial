import { agregarFederal, parseLinhasFederal } from './federal-agregar';
import type { AgregadoFederal, LinhaOrgao } from './federal-agregar';

// Portal da Transparência do Governo Federal (API livre, Decreto 8.777/2016). Só o endpoint
// AGREGADO por órgão: contagens, sem nome nem CPF. A chave é gratuita e cadastrada por e-mail em
// portaldatransparencia.gov.br/api-de-dados/cadastrar-email; entra como variável de ambiente.
const BASE = 'https://api.portaldatransparencia.gov.br/api-de-dados/servidores/por-orgao';
const MAX_PAGINAS = 400;
const PAUSA_MS = 700; // a API limita requisições por minuto
const ESPERA_429_MS = 65_000;

export const chaveConfigurada = () => Boolean(process.env.PORTAL_TRANSPARENCIA_CHAVE?.trim());

const dorme = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

export async function coletarLinhas(opts: {
  chave: string;
  buscar?: typeof fetch;
  pausaMs?: number;
  espera429Ms?: number;
  maxPaginas?: number;
}): Promise<LinhaOrgao[]> {
  const buscar = opts.buscar ?? fetch;
  const linhas: LinhaOrgao[] = [];
  for (let pagina = 1; pagina <= (opts.maxPaginas ?? MAX_PAGINAS); pagina++) {
    let r: Response | null = null;
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      r = await buscar(`${BASE}?pagina=${pagina}`, {
        headers: { 'chave-api-dados': opts.chave, Accept: 'application/json' },
        signal: AbortSignal.timeout(30_000),
      });
      if (r.status !== 429) break;
      await dorme(opts.espera429Ms ?? ESPERA_429_MS);
    }
    if (!r || r.status === 401 || r.status === 403) throw new Error('Chave da API recusada (verifique PORTAL_TRANSPARENCIA_CHAVE).');
    if (r.status === 429) throw new Error('Limite de requisições da API excedido; tente mais tarde.');
    if (!r.ok) throw new Error(`API respondeu HTTP ${r.status} na página ${pagina}.`);
    const doCorpo = parseLinhasFederal(await r.json());
    if (doCorpo.length === 0) break;
    linhas.push(...doCorpo);
    await dorme(opts.pausaMs ?? PAUSA_MS);
  }
  return linhas;
}

// Chamado pelo worker 'transparencia-federal'. Lança em falha (o worker registra o erro).
export async function coletarAgregadoFederal(): Promise<AgregadoFederal> {
  const chave = process.env.PORTAL_TRANSPARENCIA_CHAVE?.trim();
  if (!chave) throw new Error('Chave não configurada: defina PORTAL_TRANSPARENCIA_CHAVE no EasyPanel.');
  return agregarFederal(await coletarLinhas({ chave }));
}
