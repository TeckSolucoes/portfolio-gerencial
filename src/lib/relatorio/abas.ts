import type { Empresa } from '@/lib/empresas';

export type AbaRelatorio = { escopo: string; rotulo: string; gerenteComercialId: string | null };

const GERENTES_LEGADOS = ['Luana Cosme', 'Adriano Monteiro', 'Daniel Mansur', 'Marcos Mota'];

export function montarAbasRelatorio(
  gerentes: readonly { id: string; nome: string }[],
  usarLegado = true,
): AbaRelatorio[] {
  const normalizar = (nome: string) => nome.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().replace(/\s+/g, ' ').toUpperCase();
  const oficiais = gerentes.map((gerente) => ({ escopo: gerente.nome, gerenteComercialId: gerente.id }));
  const nomesOficiais = new Set(oficiais.map((item) => normalizar(item.escopo)));
  const legados = usarLegado
    ? GERENTES_LEGADOS.filter((nome) => !nomesOficiais.has(normalizar(nome))).map((nome) => ({ escopo: nome, gerenteComercialId: null }))
    : [];
  const origem = [...oficiais, ...legados];
  return [
    { escopo: 'Geral', rotulo: 'Geral', gerenteComercialId: null },
    ...origem.map((item) => ({ ...item, rotulo: item.escopo.trim().split(/\s+/)[0] ?? item.escopo })),
  ];
}

export async function listarAbasRelatorio(empresa: Empresa) {
  const { listarGerentesAtivos } = await import('@/lib/hierarquia/servico');
  const gerentes = await listarGerentesAtivos(empresa);
  return montarAbasRelatorio(gerentes);
}
