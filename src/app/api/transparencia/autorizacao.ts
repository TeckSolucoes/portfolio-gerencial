type RestricaoNominal = { erro: string; status: 401 | 403 };

export function restricaoOperacaoNominal(role: unknown): RestricaoNominal | null {
  if (!role) return { erro: 'Não autenticado.', status: 401 };
  if (role !== 'superadmin') return { erro: 'Ação restrita a superadmin.', status: 403 };
  return null;
}
