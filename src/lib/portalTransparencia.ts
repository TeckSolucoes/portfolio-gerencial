export function normalizarChavePortal(valor: string | undefined): string {
  const limpa = valor?.trim() ?? '';
  const aspas = limpa.match(/^(["'])(.*)\1$/);
  return (aspas?.[2] ?? limpa).trim();
}

export function erroConsultaPortal(status: number, cadastro: string): string {
  const fonte = cadastro.toUpperCase();
  if (status === 400) return `Consulta ${fonte} recusada pelo Portal (HTTP 400).`;
  if (status === 401 || status === 403) return `Chave da API rejeitada pelo Portal da Transparência (HTTP ${status}). Confira se a chave está ativa e completa.`;
  if (status === 429) return `Limite de requisições do Portal atingido (HTTP 429). Aguarde a próxima execução.`;
  if (status >= 500) return `Portal da Transparência instável (${fonte}, HTTP ${status}).`;
  return `Falha na consulta ${fonte} (HTTP ${status}).`;
}
