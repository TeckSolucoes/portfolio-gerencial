import type { Proposta } from './types';

export interface SnapshotPropostas {
  ref: string;
  propostas: Proposta[];
  funcaoSincronizadaEm?: string;
}

// A proposta externa é a unidade atualizável: uma nova leitura substitui seu estado
// anterior (jornada, integrada, cancelada etc.) sem duplicar os totais já armazenados.
export function mesclarPropostas(anteriores: readonly Proposta[], recentes: readonly Proposta[]): Proposta[] {
  const porNumero = new Map(anteriores.map((proposta) => [proposta.numero, proposta]));
  for (const proposta of recentes) porNumero.set(proposta.numero, proposta);
  return [...porNumero.values()];
}

export type EstadoFuncaoAtual = Pick<Proposta, 'numero' | 'integrada' | 'cancelada' | 'esteiraReprovada'>
  & Partial<Pick<Proposta, 'dataIntegracao' | 'valorLiberado' | 'esteira'>>;

type OpcoesAtualizacaoFuncao = {
  ausentes?: 'marcar-nao-conciliada' | 'preservar';
};

const normalizar = (valor: unknown) => String(valor ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toUpperCase();

export function aplicarEstadosFuncao(
  propostas: readonly Proposta[],
  estados: readonly EstadoFuncaoAtual[],
  opcoes: OpcoesAtualizacaoFuncao = {},
): Proposta[] {
  const porNumero = new Map(estados.map((estado) => [estado.numero, estado]));
  return propostas.map((proposta) => {
    if (!proposta.temCodigoFuncao) return { ...proposta, conciliadaFuncao: false };
    const estado = porNumero.get(proposta.numero);
    if (!estado) return opcoes.ausentes === 'preservar' ? { ...proposta } : { ...proposta, conciliadaFuncao: false };
    const statusFront = normalizar(proposta.status);
    const integrada = estado.integrada || statusFront.includes('INTEGRAD');
    const cancelada = estado.cancelada || statusFront.includes('CANCEL');
    return {
      ...proposta,
      dataIntegracao: estado.dataIntegracao,
      estadoFuncao: { integrada: estado.integrada, cancelada: estado.cancelada, esteiraReprovada: estado.esteiraReprovada },
      valorLiberado: estado.valorLiberado,
      esteira: estado.esteira ?? proposta.esteira,
      conciliadaFuncao: true,
      integrada,
      cancelada,
      esteiraReprovada: estado.esteiraReprovada,
    };
  });
}

export function watermarkSql(valor: string): string {
  const data = new Date(valor);
  if (!Number.isFinite(data.getTime())) throw new Error('Watermark inválido.');
  return data.toISOString().slice(0, 23).replace('T', ' ');
}
