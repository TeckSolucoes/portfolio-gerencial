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
}

// Um bloco por empresa, em texto com a formatação do WhatsApp (*negrito*, _itálico_).
export function montarBloco({ relatorio: r, empresa, aba, metaOficial, horaParcial }: EntradaMensagem): string {
  const k = r.kpis;
  const [ano, mes, dia] = r.ref.split('-');
  const doGerente = aba !== 'Geral';
  const pagos = k.pagosMes.valor;
  const meta = metaOficial
    ? {
        valor: metaOficial.valor,
        falta: Math.max(0, Math.round((metaOficial.valor - pagos) * 100) / 100),
        faltaPct: metaOficial.valor > 0 ? Math.max(0, (metaOficial.valor - pagos) / metaOficial.valor) : null,
      }
    : r.meta;
  const rotuloMeta = metaOficial ? (metaOficial.faltando.length ? 'OFICIAL · PARCIAL' : 'OFICIAL') : 'MODELO';
  const excDiaPct = k.total.valor ? k.excecaoDia.valor / k.total.valor : null;
  const rp = r.rankingPagos;
  const ranking = (rotulo: string, item: { nome: string; pct: number } | null) => `• ${rotulo}: ${item ? `${item.nome} (${pct(item.pct)})` : NAO}`;

  return [
    `*Relatório diário — ${empresa} · ${aba}*`,
    `${dia}/${mes}/${ano} · ${horaParcial ? `parcial, atualizado às ${horaParcial}` : 'dia fechado'}`,
    '',
    '*Vendas do dia*',
    `• Total: ${soma(k.total)}`,
    `• Novas: ${soma(k.novas)} · Reinseridas: ${soma(k.reinseridas)}`,
    `• Exceção: ${soma(k.excecaoDia)} · ${pct(excDiaPct)} do dia`,
    `• Front: ${soma(k.front)} · CCNET: ${soma(k.ccnet)}`,
    `• Cancelados ontem: ${soma(k.canceladosOntem)}`,
    '',
    `*Mês · ${MESES[Number(mes) - 1]}/${ano} até ${dia}/${mes}*`,
    `• Vendas: ${soma(k.vendasMes)}`,
    `• Cancelados: ${soma(k.canceladosMes)} · ${pct(k.canceladosMesPct)}`,
    `• Pagos: ${soma(k.pagosMes)} · exceção ${soma(k.pagosExcecaoMes)}`,
    `• Meta (${rotuloMeta}): ${brl(meta?.valor)}`,
    doGerente ? '• Falta: só no Geral (a meta é da empresa)' : `• Falta: ${brl(meta?.falta)} · ${pct(meta?.faltaPct)} para a meta`,
    '',
    '*Clientes do dia*',
    `• Da casa: ${brl(r.clientes?.casaDia.valor)} (${num(r.clientes?.casaDia.cpfs)} CPF) · Novos: ${soma(r.clientes?.novoDia)}`,
    '',
    '*Ranking dos pagos*',
    ranking('Convênio', rp?.convenio ?? null),
    ranking('Produto', rp?.produto ?? null),
    ranking('Equipe', rp?.equipe ?? null),
    ranking('Gerente', rp?.gerente ?? null),
    '',
    '*Churn*',
    `• Dos que fecharam: ${pct(r.churn?.taxa, 0)} morreu (${num(r.churn?.morreram)} de ${num(r.churn?.fecharam)})`,
    `• Não voltou: ${num(r.churn?.naoVoltou)} · Voltou e morreu: ${num(r.churn?.voltouMorreu)}`,
  ].join('\n');
}

export const juntarBlocos = (blocos: string[], link: string | null) =>
  [blocos.join('\n\n————————\n\n'), link ? `\nRelatório completo: ${link}` : ''].join('\n').trim();
