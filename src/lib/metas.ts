import 'server-only';
import { prisma } from '@/lib/prisma';
import type { Empresa } from './empresas';

export interface MetaDoMes {
  valor: number;
  faltando: Empresa[]; // empresas visíveis sem meta cadastrada neste mês
}

// Soma a meta das empresas informadas. Devolve null se nenhuma tem meta: o relatório então
// mostra a meta de MODELO em vez de inventar uma.
export async function metaDoMes(empresas: readonly Empresa[], mes: string): Promise<MetaDoMes | null> {
  const linhas = await prisma.metaMensal.findMany({ where: { mes, empresa: { in: [...empresas] } } });
  if (linhas.length === 0) return null;
  const tem = new Set(linhas.map((l) => l.empresa));
  return {
    valor: linhas.reduce((t, l) => t + l.valor, 0),
    faltando: empresas.filter((e) => !tem.has(e)),
  };
}
