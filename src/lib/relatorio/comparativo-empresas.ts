import { EMPRESAS, type Empresa } from '../empresas';
import { podeAcessar, podeVerAba, type Acesso } from '../permissoes';
import type { EntradaCache } from '../workers/cache';
import { mesclarPropostas, type SnapshotPropostas } from './snapshot';
import { construirCasos } from './casos';

export interface ComparativoEmpresas {
  ref: string;
  inicio: string;
  dias: 1 | 7;
  empresas: { empresa: Empresa; qtd: number; valor: number; geradoEm: string; desatualizado: boolean }[];
  lider: Empresa | null;
  estado: 'disponivel' | 'indisponivel';
  motivo?: string;
}

export function montarComparativoEmpresas(
  snapshots: readonly (EntradaCache<SnapshotPropostas> | null)[],
  ref: string,
  dias: 1 | 7,
  agora = Date.now(),
): ComparativoEmpresas {
  const resultado: ComparativoEmpresas = {
    ref, inicio: ref, dias, empresas: [], lider: null, estado: 'indisponivel',
  };
  const inicio = new Date(`${ref}T12:00:00Z`);
  if (!Number.isFinite(inicio.getTime()) || inicio.toISOString().slice(0, 10) !== ref) {
    return { ...resultado, motivo: 'Data de referência inválida.' };
  }
  inicio.setUTCDate(inicio.getUTCDate() - dias + 1);
  resultado.inicio = inicio.toISOString().slice(0, 10);
  for (const [indice, empresa] of EMPRESAS.entries()) {
    const snapshot = snapshots[indice];
    if (!snapshot || !Array.isArray(snapshot.dados?.propostas)) {
      return { ...resultado, motivo: `Snapshot de ${empresa} indisponível.` };
    }
    const geradoEm = new Date(snapshot.geradoEm).getTime();
    const coberturaInicio = new Date(`${snapshot.dados.ref}T12:00:00Z`);
    coberturaInicio.setUTCDate(coberturaInicio.getUTCDate() - 31);
    if (!Number.isFinite(geradoEm) || agora - geradoEm > 86_400_000 || geradoEm > agora
      || !Number.isFinite(coberturaInicio.getTime()) || snapshot.dados.ref !== snapshots[0]?.dados.ref
      || snapshot.dados.ref < ref || resultado.inicio < coberturaInicio.toISOString().slice(0, 10)) {
      return { ...resultado, motivo: `Snapshot de ${empresa} desatualizado ou sem cobertura da referência.` };
    }
  }
  for (const [indice, empresa] of EMPRESAS.entries()) {
    const snapshot = snapshots[indice]!;
    const propostas = construirCasos(mesclarPropostas([], snapshot.dados.propostas)).casos
      .flatMap((caso) => caso.propostas)
      .filter((proposta) => proposta.data >= resultado.inicio && proposta.data <= ref);
    let centavos = 0;
    for (const proposta of propostas) {
      const brutoCentavos = proposta.valor * 100;
      const valor = Math.round(brutoCentavos + Number.EPSILON * Math.abs(brutoCentavos));
      if (!Number.isFinite(proposta.valor) || proposta.valor < 0 || !Number.isSafeInteger(valor) || !Number.isSafeInteger(centavos + valor)) {
        return { ...resultado, empresas: [], motivo: `Valor contratado inválido no snapshot de ${empresa}.` };
      }
      centavos += valor;
    }
    resultado.empresas.push({ empresa, qtd: propostas.length, valor: centavos / 100, geradoEm: snapshot.geradoEm, desatualizado: false });
  }
  const [akrk, dig] = resultado.empresas;
  resultado.lider = akrk.valor === dig.valor ? null : akrk.valor > dig.valor ? 'AKRK' : 'DIG';
  resultado.estado = 'disponivel';
  return resultado;
}

export async function carregarComparativoEmpresas(acesso: Acesso, ref: string, dias: 1 | 7): Promise<ComparativoEmpresas | null> {
  if (!podeAcessar(acesso, 'relatorio') || !podeVerAba(acesso, 'Geral')
    || !EMPRESAS.every((empresa) => acesso.empresas.includes(empresa))) return null;
  const { lerCache } = await import('@/lib/workers/cache');
  const snapshots = await Promise.all(EMPRESAS.map(async (empresa) => {
    try {
      return await lerCache<SnapshotPropostas>(`relatorio-propostas-v3-${empresa.toLowerCase()}`);
    } catch {
      return null;
    }
  }));
  return montarComparativoEmpresas(snapshots, ref, dias);
}
