import { construirCasos } from './casos';
import type {
  Caso,
  Contagem,
  Escopo,
  LinhaDesfecho,
  LinhaLista,
  LinhaSoma,
  Proposta,
  Ranking,
  Relatorio,
  Soma,
  Tipo,
  TrocaEquipe,
} from './types';

const TIPOS: Tipo[] = ['Novo', 'Compra', 'Adiantamento'];

export const GERENTES = ['Luana Cosme', 'Adriano Monteiro', 'Daniel Mansur', 'Marcos Mota'];

const semAcento = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().trim();

// O Front grava o nome completo (e às vezes com sobrenomes a mais); o gerente é casado pelo primeiro nome.
export function escopoGerente(nome: string): Escopo {
  const primeiro = semAcento(nome).split(/\s+/)[0];
  return { nome, corresponde: (gerente) => semAcento(gerente).startsWith(primeiro) };
}

const titulo = (s: string) =>
  s.toLowerCase().replace(/(^|\s)(\S)/g, (_, esp, c) => esp + c.toUpperCase());

// O Front chama a equipe de "AKRK - PRAIA DO FLAMENGO"; o relatório usa só "Flamengo".
export const nomeEquipe = (equipe: string) =>
  titulo(equipe.replace(/^AKRK\s*-\s*/i, '').replace(/^PRAIA\s+(DO|DA|DE)\s+/i, ''));

// Meta é número de MODELO até a meta oficial chegar (o modelo do CEO usa R$ 8.000.000).
const ROTULO_PRODUTO: Record<Proposta['produto'], string> = {
  Crédito: 'Cartão crédito',
  Benefício: 'Cartão benefício',
  Empréstimo: 'Empréstimo',
  Adiantamento: 'Adiantamento',
  'Não informado': 'Não informado',
};

export const META_MODELO = 8_000_000;

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
  // Pago = Integrado. O mês do ranking segue o evento de integração, não a criação da proposta.
  // O fallback mantém compatibilidade com fontes antigas e dados sintéticos sem a nova data.
  const pagosMes = escopoTodas.filter((p) => p.integrada && (p.dataIntegracao || p.data).startsWith(mes) && (p.dataIntegracao || p.data) <= ref);
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

  const topo = (itens: Proposta[], chave: (p: Proposta) => string): Ranking | null => {
    const l = agrupar(itens, chave, (p) => p.valor)[0];
    const total = itens.reduce((t, p) => t + p.valor, 0);
    return l ? { nome: l.chave, valor: l.valor, pct: total ? l.valor / total : 0 } : null;
  };

  // Cliente da casa: o CPF já tinha proposta anterior no grupo (qualquer tipo ou produto).
  // Aqui o desempate do mesmo dia é pelo número crescente, como no modelo do CEO; no
  // "nova x reinserida" o desempate é decrescente (ver casos.ts). Os dois reproduzem a prova.
  const primeiraDoCpf = new Map<string, Proposta>();
  for (const c of casos) {
    for (const p of c.propostas) {
      const atual = primeiraDoCpf.get(c.cpf);
      if (!atual || p.data < atual.data || (p.data === atual.data && Number(p.numero) < Number(atual.numero))) {
        primeiraDoCpf.set(c.cpf, p);
      }
    }
  }
  const cpfDe = new Map<Proposta, string>();
  for (const c of casos) for (const p of c.propostas) cpfDe.set(p, c.cpf);
  const casa = (p: Proposta) => primeiraDoCpf.get(cpfDe.get(p)!) !== p;
  const cpfsDistintos = (ps: Proposta[]) => new Set(ps.map((p) => cpfDe.get(p))).size;

  const vendasDoDia = vendas.map((v) => v.p);
  const casaDia = vendasDoDia.filter(casa);
  const casaMesPs = vendasMes.filter(casa);

  const mesNovaReins = casos
    .filter((c) => doEscopo(c.gerente) || c.propostas.some((p) => doEscopo(p.gerente)))
    .flatMap((c) => c.propostas.map((p, i) => ({ p, nova: i === 0 })))
    .filter((x) => doMes(x.p) && doEscopo(x.p.gerente));

  const fechados = contagemMes.pagou + contagemMes.morreu;
  const equipesFechadas = desfechoPor(casosMes, (c) => nomeEquipe(c.equipe))
    .map((l) => ({ equipe: l.chave, fechou: l.pagou + l.morreu, taxa: l.morreu / (l.pagou + l.morreu || 1) }))
    .filter((e) => e.fechou >= 10)
    .sort((a, b) => b.taxa - a.taxa)
    .slice(0, 6)
    .map(({ equipe, taxa }) => ({ equipe, taxa }));

  const excecaoPs = vendasMes.filter((p) => p.excecao);
  const excecaoEquipes = [...new Set(excecaoPs.map((p) => nomeEquipe(p.equipe)))]
    .map((eq) => {
      const doEq = excecaoPs.filter((p) => nomeEquipe(p.equipe) === eq);
      return { equipe: eq, vendeu: somar(doEq), pagou: somar(doEq.filter((p) => p.integrada)) };
    })
    .sort((a, b) => b.vendeu.valor - a.vendeu.valor);

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
    porEquipe: desfechoPor(casosMes, (c) => nomeEquipe(c.equipe)),
    porOperador: desfechoPor(casosMes, (c) => c.operador),
    resumoMes: {
      inseriu: contagemMes.casos,
      pagou: contagemMes.pagou,
      morreu: contagemMes.morreu,
      jornada: contagemMes.jornada,
    },
    lista,
    rankingEquipes: agrupar(vendas, (v) => nomeEquipe(v.p.equipe), (v) => v.p.valor),
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
    clientes: {
      casaDia: { ...somar(casaDia), cpfs: cpfsDistintos(casaDia) },
      novoDia: somar(vendasDoDia.filter((p) => !casa(p))),
      casaMes: { ...somar(casaMesPs), cpfs: cpfsDistintos(casaMesPs) },
    },
    meta: {
      valor: META_MODELO,
      modelo: true,
      pagos: somar(pagosMes),
      pagosExcecao: somar(pagosMes.filter((p) => p.excecao)),
      pagosExcecaoPct: somar(pagosMes).valor === 0 ? null : somar(pagosMes.filter((p) => p.excecao)).valor / somar(pagosMes).valor,
      falta: centavos(META_MODELO - somar(pagosMes).valor),
      faltaPct: (META_MODELO - somar(pagosMes).valor) / META_MODELO,
    },
    rankingPagos: {
      convenio: topo(pagosMes, (p) => titulo(p.convenio)),
      produto: topo(pagosMes, (p) => ROTULO_PRODUTO[p.produto]),
      equipe: topo(pagosMes, (p) => nomeEquipe(p.equipe)),
      gerente: topo(pagosMes, (p) => titulo(p.gerente.split(/\s+/)[0])),
    },
    novaReinserida: {
      dia: { novas: somar(vendas.filter((v) => v.nova).map((v) => v.p)), reinseridas: somar(vendas.filter((v) => !v.nova).map((v) => v.p)) },
      mes: {
        novas: somar(mesNovaReins.filter((x) => x.nova).map((x) => x.p)),
        reinseridas: somar(mesNovaReins.filter((x) => !x.nova).map((x) => x.p)),
      },
    },
    excecaoEquipes,
    churn: {
      naoVoltou: lista.length,
      naoVoltouPct: casosMes.length === 0 ? null : lista.length / casosMes.length,
      voltouMorreu: casosMes.filter((c) => c.desfecho === 'Morreu' && c.propostas.length > 1).length,
      fecharam: fechados,
      morreram: contagemMes.morreu,
      taxa: contagemMes.taxaMorte,
      equipes: equipesFechadas,
      fimDaLista: {
        'Reprovado Front': lista.filter((l) => l.fim === 'Reprovado Front').length,
        'Reprovado CCNET': lista.filter((l) => l.fim === 'Reprovado CCNET').length,
        Cancelado: lista.filter((l) => l.fim === 'Cancelado').length,
      },
    },
  };
}
