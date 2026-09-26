import { construirCasos } from './casos';
import type {
  Caso,
  Contagem,
  Escopo,
  LinhaDesfecho,
  LinhaLista,
  LinhaSoma,
  Proposta,
  Relatorio,
  Soma,
  Tipo,
  TrocaEquipe,
} from './types';

const TIPOS: Tipo[] = ['Novo', 'Compra', 'Adiantamento'];

export const GERENTES = ['Luana Cosme', 'Adriano Monteiro', 'Daniel Mansur', 'Marcos Mota'];

const semAcento = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().trim();

// O Front grava o nome completo do gerente; a turma é achada pelo começo do nome.
export function escopoGerente(nome: string): Escopo {
  return { nome, corresponde: (gerente) => semAcento(gerente).startsWith(semAcento(nome)) };
}

const centavos = (n: number) => Math.round(n * 100) / 100;

const somar = (ps: Proposta[]): Soma => ({ qtd: ps.length, valor: centavos(ps.reduce((s, p) => s + p.valor, 0)) });

function agrupar<T>(itens: T[], chave: (t: T) => string, valor: (t: T) => number): LinhaSoma[] {
  const m = new Map<string, Soma>();
  for (const it of itens) {
    const k = chave(it) || '(vazio)';
    const atual = m.get(k) ?? { qtd: 0, valor: 0 };
    atual.qtd += 1;
    atual.valor += valor(it);
    m.set(k, atual);
  }
  return [...m]
    .map(([chave, s]) => ({ chave, qtd: s.qtd, valor: centavos(s.valor) }))
    .sort((a, b) => b.valor - a.valor || b.qtd - a.qtd || a.chave.localeCompare(b.chave));
}

function contar(casos: Caso[]): Contagem {
  const pagou = casos.filter((c) => c.desfecho === 'Pagou').length;
  const morreu = casos.filter((c) => c.desfecho === 'Morreu').length;
  const fechados = pagou + morreu;
  return {
    casos: casos.length,
    pagou,
    morreu,
    jornada: casos.length - fechados,
    taxaMorte: fechados === 0 ? null : morreu / fechados,
    mortesFront: casos.filter((c) => c.etapaMorte === 'Front').length,
    mortesCcnet: casos.filter((c) => c.etapaMorte === 'CCNET').length,
  };
}

function desfechoPor(casos: Caso[], chave: (c: Caso) => string): LinhaDesfecho[] {
  const m = new Map<string, LinhaDesfecho>();
  for (const c of casos) {
    const k = chave(c) || '(vazio)';
    const linha = m.get(k) ?? { chave: k, pagou: 0, morreu: 0, jornada: 0 };
    if (c.desfecho === 'Pagou') linha.pagou += 1;
    else if (c.desfecho === 'Morreu') linha.morreu += 1;
    else linha.jornada += 1;
    m.set(k, linha);
  }
  const total = (l: LinhaDesfecho) => l.pagou + l.morreu + l.jornada;
  return [...m.values()].sort((a, b) => total(b) - total(a) || a.chave.localeCompare(b.chave));
}

function diaAnterior(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function montarRelatorio(propostas: Proposta[], ref: string, escopo: Escopo | null = null): Relatorio {
  const { casos, descartadas } = construirCasos(propostas);
  const doEscopo = (gerente: string) => (escopo ? escopo.corresponde(gerente) : true);
  const mes = ref.slice(0, 7);
  const alertas: string[] = [];

  // Venda do dia é por proposta (gerente de quem inseriu aquela proposta);
  // os números de caso abaixo seguem o gerente do lote.
  const vendas = casos
    .flatMap((c) => c.propostas.map((p, i) => ({ p, nova: i === 0, tipo: c.tipo })))
    .filter((v) => v.p.data === ref && doEscopo(v.p.gerente));

  const casosMes = casos.filter((c) => c.lote.startsWith(mes) && doEscopo(c.gerente));
  const contagemMes = contar(casosMes);

  const todas = casos.flatMap((c) => c.propostas);
  const doMes = (p: Proposta) => p.data.startsWith(mes);
  const escopoTodas = todas.filter((p) => doEscopo(p.gerente));
  const canceladas = escopoTodas.filter((p) => p.cancelada);
  const vendasMes = escopoTodas.filter(doMes);
  const pagosMes = vendasMes.filter((p) => p.integrada);
  const ontem = diaAnterior(ref);
  const trazDataCancelamento = todas.some((p) => p.cancelada && p.dataCancelamento);
  const canceladasOntemProps = trazDataCancelamento
    ? todas.filter((p) => p.cancelada && p.dataCancelamento === ontem && doEscopo(p.gerente))
    : null;

  const trocasEquipe: TrocaEquipe[] = [];
  for (const c of casos) {
    for (let i = 1; i < c.propostas.length; i++) {
      const p = c.propostas[i];
      const anterior = c.propostas[i - 1];
      if (p.data === ref && doEscopo(p.gerente) && p.equipe !== anterior.equipe) {
        trocasEquipe.push({
          nome: c.nome,
          cpf: c.cpf,
          numero: p.numero,
          de: anterior.equipe,
          para: p.equipe,
          gerenteDe: anterior.gerente,
          gerentePara: p.gerente,
        });
      }
    }
  }

  const lista: LinhaLista[] = casosMes
    .filter((c) => c.propostas.length === 1 && c.desfecho === 'Morreu')
    .map((c) => {
      const p = c.propostas[0];
      return {
        nome: c.nome,
        cpf: c.cpf,
        numero: p.numero,
        lote: c.lote,
        tipo: c.tipo,
        produto: c.produto,
        fim: c.fim!,
        motivo: p.motivoCancFront || p.motivoCancelamento || p.status,
        equipe: c.equipe,
        operador: c.operador,
      };
    })
    .sort((a, b) => a.lote.localeCompare(b.lote) || a.nome.localeCompare(b.nome));

  const lotes = new Map<string, number>();
  for (const c of casosMes) lotes.set(c.lote, (lotes.get(c.lote) ?? 0) + 1);

  if (vendas.length === 0) {
    alertas.push(`Nenhuma proposta em ${ref}: confira a extração antes de enviar.`);
  }
  if (descartadas.length > 0) {
    alertas.push(`${descartadas.length} proposta(s) descartada(s) por CPF ausente ou inválido.`);
  }
  if (canceladasOntemProps === null) {
    alertas.push('A fonte não traz data de cancelamento: "cancelados de ontem" indisponível.');
  }

  return {
    ref,
    escopo: escopo ? escopo.nome : 'Geral',
    kpis: {
      total: somar(vendas.map((v) => v.p)),
      novas: somar(vendas.filter((v) => v.nova).map((v) => v.p)),
      reinseridas: somar(vendas.filter((v) => !v.nova).map((v) => v.p)),
      front: somar(vendas.filter((v) => !v.p.temCodigoFuncao).map((v) => v.p)),
      ccnet: somar(vendas.filter((v) => v.p.temCodigoFuncao).map((v) => v.p)),
      canceladosOntem: canceladasOntemProps === null ? null : somar(canceladasOntemProps),
      taxaMes: contagemMes.taxaMorte,
      excecaoDia: somar(vendas.filter((v) => v.p.excecao).map((v) => v.p)),
      vendasMes: somar(vendasMes),
      vendasGeral: somar(escopoTodas),
      canceladosMes: somar(canceladas.filter(doMes)),
      canceladosMesPct: vendasMes.length === 0 ? null : canceladas.filter(doMes).length / vendasMes.length,
      canceladosGeral: somar(canceladas),
      pagosMes: somar(pagosMes),
      pagosExcecaoMes: somar(pagosMes.filter((p) => p.excecao)),
      excecaoMes: somar(vendasMes.filter((p) => p.excecao)),
    },
    etapasFront: agrupar(
      vendas.filter((v) => !v.p.temCodigoFuncao),
      (v) => v.p.status,
      (v) => v.p.valor,
    ),
    etapasCcnet: agrupar(
      vendas.filter((v) => v.p.temCodigoFuncao),
      (v) => v.p.esteira || '(sem esteira informada)',
      (v) => v.p.valor,
    ),
    canalMes: Object.fromEntries(TIPOS.map((t) => [t, contar(casosMes.filter((c) => c.tipo === t))])) as Record<
      Tipo,
      Contagem
    >,
    loteDia: [...lotes].map(([data, n]) => ({ data, casos: n })).sort((a, b) => a.data.localeCompare(b.data)),
    porGerente: desfechoPor(casosMes, (c) => c.gerente),
    porEquipe: desfechoPor(casosMes, (c) => c.equipe),
    porOperador: desfechoPor(casosMes, (c) => c.operador),
    resumoMes: {
      inseriu: contagemMes.casos,
      pagou: contagemMes.pagou,
      morreu: contagemMes.morreu,
      jornada: contagemMes.jornada,
    },
    lista,
    rankingEquipes: agrupar(vendas, (v) => v.p.equipe, (v) => v.p.valor),
    rankingOperadores: agrupar(vendas, (v) => v.p.operador, (v) => v.p.valor),
    porConvenio: agrupar(vendas, (v) => v.p.convenio, (v) => v.p.valor),
    porProduto: agrupar(vendas, (v) => v.p.produto, (v) => v.p.valor),
    porTipo: agrupar(vendas, (v) => v.tipo, (v) => v.p.valor),
    trocasEquipe,
    canceladasOntem:
      canceladasOntemProps === null
        ? null
        : canceladasOntemProps.map((p) => ({
            nome: p.nome,
            equipe: p.equipe,
            motivo: p.motivoCancFront || p.motivoCancelamento || p.status,
            valor: p.valor,
          })),
    alertas,
  };
}
