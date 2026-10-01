import { formatarBRL } from '../dinheiro';
import type { Relatorio, Soma } from '../relatorio/types';

export const MAX_DESTINATARIOS = 20;

// Aceita número com ou sem DDI (sem DDI vira Brasil), grupo (...@g.us) ou @lid, um por linha.
export function normalizarDestinatarios(texto: string): { ok: true; lista: string[] } | { ok: false; erro: string } {
  const lista: string[] = [];
  for (const bruto of texto.split(/[\n,;]+/)) {
    const item = bruto.trim();
    if (!item) continue;
    if (/@(g\.us|lid)$/i.test(item)) {
      if (!/^[\d-]+@(g\.us|lid)$/i.test(item)) return { ok: false, erro: `Destinatário inválido: "${item}".` };
      lista.push(item.toLowerCase());
      continue;
    }
    const digitos = item.replace(/\D/g, '');
    const numero = digitos.length === 10 || digitos.length === 11 ? `55${digitos}` : digitos;
    if (numero.length < 12 || numero.length > 13) return { ok: false, erro: `Número inválido: "${item}". Use DDD + número, com ou sem o 55.` };
    lista.push(numero);
  }
  const unicos = [...new Set(lista)];
  if (unicos.length === 0) return { ok: false, erro: 'Informe pelo menos um destinatário.' };
  if (unicos.length > MAX_DESTINATARIOS) return { ok: false, erro: `No máximo ${MAX_DESTINATARIOS} destinatários.` };
  return { ok: true, lista: unicos };
}

const NAO = '—';
const brl = (n: number | null | undefined) => (n == null ? NAO : formatarBRL(n));
const num = (n: number | null | undefined) => (n == null ? NAO : n.toLocaleString('pt-BR'));
const pct = (f: number | null | undefined, casas = 1) =>
  f == null ? NAO : `${(f * 100).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
const soma = (s: Soma | null | undefined) => (s ? `${brl(s.valor)} (${num(s.qtd)})` : NAO);
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export interface EntradaMensagem {
  relatorio: Relatorio;
  empresa: string; // rótulo da empresa
  aba: string; // "Geral" ou o nome do gerente
  // Meta cadastrada em /admin/metas; sem ela vale a meta de MODELO do relatório (mesma regra da tela).
  metaOficial: { valor: number; faltando: string[] } | null;
  horaParcial: string | null; // "14:05" quando o dia ainda está em formação
  cabecalhoCurto?: boolean; // quando há mais de uma empresa, o título geral aparece uma vez só
}

function resolverMeta({ relatorio: r, metaOficial }: EntradaMensagem) {
  const pagos = r.kpis.pagosMes.valor;
  return metaOficial
    ? {
        valor: metaOficial.valor,
        falta: Math.max(0, Math.round((metaOficial.valor - pagos) * 100) / 100),
        faltaPct: metaOficial.valor > 0 ? Math.max(0, (metaOficial.valor - pagos) / metaOficial.valor) : null,
      }
    : r.meta;
}

function gerarInsights(entrada: EntradaMensagem): string[] {
  const { relatorio: r, aba } = entrada;
  const k = r.kpis;
  const meta = resolverMeta(entrada);
  const doGerente = aba !== 'Geral';
  const rp = r.rankingPagos;
  const insights: string[] = [];

  if (!doGerente && meta?.falta != null && meta.falta > 0) {
    insights.push(`Meta: faltam ${brl(meta.falta)} (${pct(meta.faltaPct)}) para o objetivo do mês.`);
  }
  if (k.canceladosMesPct != null && k.canceladosMes.qtd > 0) {
    insights.push(`Cancelamentos: ${pct(k.canceladosMesPct)} das vendas do mês; priorize os motivos mais recorrentes e as propostas recuperáveis.`);
  }
  if (r.churn?.taxa != null && r.churn.fecharam > 0) {
    insights.push(`Churn: ${pct(r.churn.taxa, 0)} dos casos encerrados morreram; acompanhe as equipes com maior perda.`);
  }
  if (rp?.convenio && rp.convenio.pct >= 0.5) {
    insights.push(`Concentração: ${rp.convenio.nome} representa ${pct(rp.convenio.pct)} dos pagos; monitore dependência e oportunidade nos demais convênios.`);
  }
  return (insights.length ? insights : ['Sem alerta relevante nas métricas disponíveis neste período.']).slice(0, 3);
}

// Um bloco por empresa, em texto com a formatação do WhatsApp (*negrito*, _itálico_).
export function montarBloco({ relatorio: r, empresa, aba, metaOficial, horaParcial, cabecalhoCurto = false }: EntradaMensagem): string {
  const k = r.kpis;
  const [ano, mes, dia] = r.ref.split('-');
  const doGerente = aba !== 'Geral';
  const meta = resolverMeta({ relatorio: r, empresa, aba, metaOficial, horaParcial, cabecalhoCurto });
  const rotuloMeta = metaOficial ? (metaOficial.faltando.length ? 'OFICIAL · PARCIAL' : 'OFICIAL') : 'MODELO';
  const excDiaPct = k.total.valor ? k.excecaoDia.valor / k.total.valor : null;
  const rp = r.rankingPagos;
  const ranking = (rotulo: string, item: { nome: string; pct: number } | null) => `• ${rotulo}: ${item ? `${item.nome} (${pct(item.pct)})` : NAO}`;
  const nrMes = r.novaReinserida?.mes;
  const etapas = (lista: { chave: string; qtd: number; valor: number }[] | undefined) =>
    (lista ?? []).slice(0, 5).map((e) => `  – ${e.chave}: ${num(e.qtd)} · ${brl(e.valor)}`);
  const canal = (t: 'Novo' | 'Compra' | 'Adiantamento') => {
    const c = r.canalMes?.[t];
    return `• ${t}: ${pct(c?.taxaMorte)} morreu · ${num(c?.casos)} casos (pagou ${num(c?.pagou)}, morreu ${num(c?.morreu)}, jornada ${num(c?.jornada)})`;
  };
  const lote = r.resumoMes;

  return [
    cabecalhoCurto ? `*${empresa} · ${aba}*` : `📊 *Relatório diário — ${empresa} · ${aba}*`,
    `🗓️ ${dia}/${mes}/${ano} · ${horaParcial ? `parcial, atualizado às ${horaParcial}` : 'dia fechado'}`,
    '',
    '💰 *Vendas do dia*',
    `• Total: ${soma(k.total)}`,
    `• Novas: ${soma(k.novas)} · Reinseridas: ${soma(k.reinseridas)}`,
    `• Exceção: ${soma(k.excecaoDia)} · ${pct(excDiaPct)} do dia`,
    `• Front: ${soma(k.front)} · CCNET: ${soma(k.ccnet)}`,
    `• Cancelados ontem: ${soma(k.canceladosOntem)}`,
    '',
    '👥 *Clientes*',
    `• Da casa (dia): ${brl(r.clientes?.casaDia.valor)} · ${num(r.clientes?.casaDia.qtd)} propostas · ${num(r.clientes?.casaDia.cpfs)} CPF`,
    `• Novo (dia): ${soma(r.clientes?.novoDia)}`,
    `• Da casa (mês): ${brl(r.clientes?.casaMes.valor)} · ${num(r.clientes?.casaMes.qtd)} propostas · ${num(r.clientes?.casaMes.cpfs)} CPF`,
    '',
    `📅 *Mês · ${MESES[Number(mes) - 1]}/${ano} até ${dia}/${mes}*`,
    `• Vendas: ${soma(k.vendasMes)}`,
    `• Cancelados: ${soma(k.canceladosMes)} · ${pct(k.canceladosMesPct)}`,
    `• Novas: ${soma(nrMes?.novas)} · Reinseridas: ${soma(nrMes?.reinseridas)}`,
    `• Janela de 32 dias: vendas ${soma(k.vendasGeral)} · cancelados ${soma(k.canceladosGeral)}`,
    '',
    `🎯 *Meta (${rotuloMeta})*`,
    `• Meta: ${brl(meta?.valor)}`,
    `• Pagos: ${soma(k.pagosMes)} · exceção ${soma(k.pagosExcecaoMes)}`,
    doGerente ? '• Falta: só no Geral (a meta é da empresa)' : `• Falta: ${brl(meta?.falta)} · ${pct(meta?.faltaPct)} para a meta`,
    '',
    '🏆 *Ranking dos pagos*',
    ranking('Convênio', rp?.convenio ?? null),
    ranking('Produto', rp?.produto ?? null),
    ranking('Equipe', rp?.equipe ?? null),
    ranking('Gerente', rp?.gerente ?? null),
    '',
    '⚡ *Exceção vendida*',
    `• Dia: ${soma(k.excecaoDia)} · Mês: ${soma(k.excecaoMes)} · Pagos: ${soma(k.pagosExcecaoMes)}`,
    ...(r.excecaoEquipes ?? []).slice(0, 5).map((e) => `  – ${e.equipe}: vendeu ${soma(e.vendeu)} · pagou ${soma(e.pagou)}`),
    '',
    '🧭 *Por canal (mês)*',
    canal('Novo'),
    canal('Compra'),
    canal('Adiantamento'),
    '',
    '⚠️ *Churn*',
    `• Dos que fecharam: ${pct(r.churn?.taxa, 0)} morreu (${num(r.churn?.morreram)} de ${num(r.churn?.fecharam)})`,
    `• Não voltou: ${num(r.churn?.naoVoltou)} · ${pct(r.churn?.naoVoltouPct, 0)} dos casos · Voltou e morreu: ${num(r.churn?.voltouMorreu)}`,
    ...(r.churn?.equipes ?? []).slice(0, 5).map((e) => `  – ${e.equipe}: ${pct(e.taxa, 0)}`),
    '',
    '📦 *Safra do mês*',
    lote ? `• Inseriu ${num(lote.inseriu)} · pagou ${num(lote.pagou)} · morreu ${num(lote.morreu)} · jornada ${num(lote.jornada)}` : `• ${NAO}`,
    // A lista tem nome e CPF de cliente: no WhatsApp vai só a contagem.
    `• Não reinseridos: ${num(r.lista?.length)} casos (nomes e CPF só no portal)`,
    '',
    '📍 *Onde está a venda do dia*',
    `• Front: ${soma(k.front)}`,
    ...etapas(r.etapasFront),
    `• CCNET: ${soma(k.ccnet)}`,
    ...etapas(r.etapasCcnet),
  ].join('\n');
}

export function montarBlocoInsights(entrada: EntradaMensagem): string {
  return [`*${entrada.empresa} · ${entrada.aba}*`, ...gerarInsights(entrada).map((insight) => `• ${insight}`)].join('\n');
}

export const juntarBlocos = (blocos: string[], tituloGrupo: string | null = null) =>
  [tituloGrupo ? `📊 *Relatório diário — ${tituloGrupo}*` : '', blocos.join('\n\n————————\n\n')].filter(Boolean).join('\n\n').trim();

export const juntarInsights = (blocos: string[], titulo: string) =>
  [`💡 *Insights para atuação — ${titulo}*`, blocos.join('\n\n')].join('\n\n').trim();
