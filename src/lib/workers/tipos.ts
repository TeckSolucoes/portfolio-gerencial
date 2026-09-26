export type GrupoWorker = 'Notícias' | 'Mercado' | 'Diário Oficial' | 'Transparência';

export interface ResultadoWorker {
  itens: number; // quantos registros a coleta trouxe
  mensagem: string; // resumo curto para a tela
  dados: unknown; // vai para o cache que as telas leem
}

// Um worker é código determinístico (fetch + parse): não usa IA e não tem custo por execução.
export interface Worker {
  id: string;
  nome: string;
  grupo: GrupoWorker;
  descricao: string;
  intervaloMin: number; // padrão; o ADM pode mudar em tela
  // Devolve o motivo de NÃO poder rodar (ex.: falta configuração) ou null se está pronto.
  pendencia?: () => string | null;
  executar: () => Promise<ResultadoWorker>;
}

export type StatusExecucao = 'rodando' | 'ok' | 'erro';

export interface EstadoWorker {
  id: string;
  nome: string;
  grupo: GrupoWorker;
  descricao: string;
  ativo: boolean;
  intervaloMin: number;
  intervaloPadraoMin: number;
  pendencia: string | null;
  rodando: boolean;
  ultima: {
    status: StatusExecucao;
    iniciadoEm: string;
    terminadoEm: string | null;
    duracaoMs: number | null;
    itens: number | null;
    mensagem: string | null;
    origem: string;
  } | null;
  ultimoSucessoEm: string | null;
  proximaEm: string | null; // null = pausado, pendente ou rodando agora
}

export const INTERVALO_MIN = 5;
export const INTERVALO_MAX = 7 * 24 * 60;

export const intervaloValido = (min: number) => Number.isInteger(min) && min >= INTERVALO_MIN && min <= INTERVALO_MAX;

// Quando o worker deve rodar de novo: início da última tentativa + intervalo. Nunca rodou = já.
// Uma execução que falhou também espera o intervalo (não martela uma fonte fora do ar).
export function proximaExecucao(ultimoInicio: Date | null, intervaloMin: number, agora = new Date()): Date {
  if (!ultimoInicio) return agora;
  return new Date(ultimoInicio.getTime() + intervaloMin * 60_000);
}

export const estaVencido = (ultimoInicio: Date | null, intervaloMin: number, agora = new Date()) =>
  proximaExecucao(ultimoInicio, intervaloMin, agora).getTime() <= agora.getTime();
