export const CLASSIFICACOES = { interno: 'Interno', externo: 'Externo' } as const;
export const SITUACOES = { ativo: 'Ativo', implantacao: 'Em implantação', descontinuado: 'Descontinuado' } as const;

export type Classificacao = keyof typeof CLASSIFICACOES;
export type Situacao = keyof typeof SITUACOES;

export interface DadosSistema {
  nome: string;
  url: string | null;
  classificacao: Classificacao;
  categoria: string;
  empresa: string | null;
  responsavel: string | null;
  situacao: Situacao;
  descricao: string | null;
}

const texto = (f: FormData, campo: string, max: number) => String(f.get(campo) ?? '').trim().slice(0, max);

// Só http/https: o link vira um <a> clicável para todos, e "javascript:" ali executaria código.
export function normalizarUrl(bruto: string): string | null | undefined {
  if (!bruto) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(bruto) ? bruto : `https://${bruto}`);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function lerSistema(f: FormData): { ok: true; dados: DadosSistema } | { ok: false; erro: string } {
  const nome = texto(f, 'nome', 120);
  const categoria = texto(f, 'categoria', 60);
  const classificacao = texto(f, 'classificacao', 20);
  const situacao = texto(f, 'situacao', 20) || 'ativo';
  const url = normalizarUrl(texto(f, 'url', 600));
  if (!nome) return { ok: false, erro: 'Informe o nome do sistema.' };
  if (!categoria) return { ok: false, erro: 'Informe a categoria.' };
  if (!(classificacao in CLASSIFICACOES)) return { ok: false, erro: 'Escolha se o sistema é interno ou externo.' };
  if (!(situacao in SITUACOES)) return { ok: false, erro: 'Situação inválida.' };
  if (url === undefined) return { ok: false, erro: 'Link inválido. Use um endereço http ou https.' };
  return {
    ok: true,
    dados: {
      nome,
      url,
      classificacao: classificacao as Classificacao,
      categoria,
      empresa: texto(f, 'empresa', 80) || null,
      responsavel: texto(f, 'responsavel', 80) || null,
      situacao: situacao as Situacao,
      descricao: texto(f, 'descricao', 400) || null,
    },
  };
}
