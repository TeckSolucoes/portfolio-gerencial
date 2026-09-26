import type { Caso, Descartada, Desfecho, Etapa, Fim, Produto, Proposta, Tipo } from './types';

const semAcento = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().trim();

// O Front usa nomes longos ("Cartão de Crédito", "Adiantamento Salarial"); o relatório usa 4 rótulos.
export function normalizarProduto(bruto: string): Produto | null {
  const p = semAcento(bruto);
  if (p.includes('ADIANT')) return 'Adiantamento';
  if (p.includes('BENEFICIO')) return 'Benefício';
  if (p.includes('CREDITO')) return 'Crédito';
  if (p.includes('EMPRESTIMO')) return 'Empréstimo';
  return null;
}

export function tipoDe(produto: Produto, modalidade: string): Tipo {
  if (produto === 'Adiantamento') return 'Adiantamento';
  if (semAcento(modalidade).startsWith('COMPRA')) return 'Compra';
  return 'Novo';
}

export function normalizarCpf(cpf: string): string | null {
  const digitos = cpf.replace(/\D/g, '');
  if (!digitos || digitos.length > 11) return null;
  return digitos.padStart(11, '0');
}

// Sem hora na fonte, o mesmo dia desempata pelo número em ordem decrescente: é o que
// reproduz a prova de 17/09 (novas 82 / R$ 700.505,03). Com hora, a hora manda.
function ordenar(itens: { p: Proposta; i: number }[]) {
  return itens.sort((a, b) => {
    if (a.p.data !== b.p.data) return a.p.data < b.p.data ? -1 : 1;
    if (a.p.hora && b.p.hora && a.p.hora !== b.p.hora) return a.p.hora < b.p.hora ? -1 : 1;
    const na = Number(a.p.numero);
    const nb = Number(b.p.numero);
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return nb - na;
    return a.i - b.i;
  });
}

function desfechoDe(propostas: Proposta[]): { desfecho: Desfecho; fim: Fim | null; etapaMorte: Etapa | null } {
  if (propostas.some((p) => p.integrada)) return { desfecho: 'Pagou', fim: null, etapaMorte: null };

  const ultima = propostas[propostas.length - 1];
  const etapa: Etapa = ultima.temCodigoFuncao || ultima.esteiraReprovada ? 'CCNET' : 'Front';

  if (ultima.cancelada) return { desfecho: 'Morreu', fim: 'Cancelado', etapaMorte: etapa };
  if (ultima.esteiraReprovada) return { desfecho: 'Morreu', fim: 'Reprovado CCNET', etapaMorte: 'CCNET' };
  if (ultima.frontReprovado && !ultima.temCodigoFuncao) {
    return { desfecho: 'Morreu', fim: 'Reprovado Front', etapaMorte: 'Front' };
  }
  return { desfecho: 'Jornada', fim: null, etapaMorte: null };
}

export function construirCasos(
  propostas: Proposta[],
  ateData?: string,
): { casos: Caso[]; descartadas: Descartada[] } {
  const descartadas: Descartada[] = [];
  const grupos = new Map<string, { p: Proposta; i: number }[]>();
  const meta = new Map<string, { cpf: string; tipo: Tipo }>();

  propostas.forEach((p, i) => {
    if (ateData && p.data > ateData) return;
    const cpf = normalizarCpf(p.cpf);
    if (!cpf) {
      descartadas.push({ proposta: p, motivo: 'CPF ausente ou inválido' });
      return;
    }
    const tipo = tipoDe(p.produto, p.modalidade);
    const chave = `${cpf}|${tipo}|${p.produto}`;
    if (!grupos.has(chave)) {
      grupos.set(chave, []);
      meta.set(chave, { cpf, tipo });
    }
    grupos.get(chave)!.push({ p, i });
  });

  const casos: Caso[] = [];
  for (const [chave, itens] of grupos) {
    const ordenadas = ordenar(itens).map((x) => x.p);
    const primeira = ordenadas[0];
    const { cpf, tipo } = meta.get(chave)!;
    casos.push({
      chave,
      cpf,
      nome: primeira.nome,
      tipo,
      produto: primeira.produto,
      propostas: ordenadas,
      lote: primeira.data,
      gerente: primeira.gerente,
      equipe: primeira.equipe,
      operador: primeira.operador,
      ...desfechoDe(ordenadas),
    });
  }
  return { casos, descartadas };
}
