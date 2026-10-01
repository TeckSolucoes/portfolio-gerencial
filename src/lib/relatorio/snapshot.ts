import type { Proposta } from './types';

export interface SnapshotPropostas {
  ref: string;
  propostas: Proposta[];
}

// A proposta externa é a unidade atualizável: uma nova leitura substitui seu estado
// anterior (jornada, integrada, cancelada etc.) sem duplicar os totais já armazenados.
export function mesclarPropostas(anteriores: readonly Proposta[], recentes: readonly Proposta[]): Proposta[] {
  const porNumero = new Map(anteriores.map((proposta) => [proposta.numero, proposta]));
  for (const proposta of recentes) porNumero.set(proposta.numero, proposta);
  return [...porNumero.values()];
}
