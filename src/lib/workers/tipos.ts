export type GrupoWorker = 'Notícias' | 'Mercado' | 'Diário Oficial' | 'Transparência';

export interface ResultadoWorker {
  itens: number; // quantos registros a coleta trouxe
  mensagem: string; // resumo curto para a tela
  dados: unknown; // vai para o cache que as telas leem
}

// Um worker é código determinístico (fetch + parse): não usa IA e não tem custo por execução.
export interface Worker {
  id: string;
  nome: string;
  grupo: GrupoWorker;
  descricao: string;
  limiteMs?: number; // teto de duração de uma execução (padrão do motor: 5 min)
  // Devolve o motivo de NÃO poder rodar (ex.: falta configuração) ou null se está pronto.
  pendencia?: () => string | null;
  executar: () => Promise<ResultadoWorker>;
}

export type StatusExecucao = 'rodando' | 'ok' | 'erro';

export interface EstadoWorker {
  id: string;
  nome: string;
  grupo: GrupoWorker;
  descricao: string;
  ativo: boolean;
  horarios: string[]; // agenda em vigor (própria ou a padrão)
  horariosProprios: boolean; // false = segue a agenda padrão
  pendencia: string | null;
  rodando: boolean;
  ultima: {
    status: StatusExecucao;
    iniciadoEm: string;
    terminadoEm: string | null;
    duracaoMs: number | null;
    itens: number | null;
    mensagem: string | null;
    origem: string;
  } | null;
  ultimoSucessoEm: string | null;
  proximaEm: string | null; // null = pausado, pendente ou rodando agora
}

// Agenda por horário do dia (Brasília). Padrão: manhã, tarde e noite; o ADM muda em tela.
export const FUSO = 'America/Sao_Paulo';
export const HORARIOS_PADRAO: readonly string[] = ['08:00', '13:00', '19:00'];
export const MAX_HORARIOS = 24;

export const horarioValido = (h: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(h);

// Ordena, tira repetidos e valida. Lança com mensagem pronta para a tela.
export function normalizarHorarios(lista: readonly string[]): string[] {
  const unicos = [...new Set(lista.map((h) => h.trim()))].sort();
  if (unicos.length === 0) throw new Error('Informe pelo menos um horário.');
  if (unicos.length > MAX_HORARIOS) throw new Error(`No máximo ${MAX_HORARIOS} horários por dia.`);
  const invalido = unicos.find((h) => !horarioValido(h));
  if (invalido) throw new Error(`Horário inválido: "${invalido}". Use HH:MM, de 00:00 a 23:59.`);
  return unicos;
}

// Lido do banco ("08:00,13:00,19:00"). Vazio ou corrompido = null (cai no padrão).
export function lerHorarios(texto: string | null | undefined): string[] | null {
  if (!texto) return null;
  try {
    return normalizarHorarios(texto.split(','));
  } catch {
    return null;
  }
}

const partesFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function partes(d: Date) {
  const p = Object.fromEntries(partesFmt.formatToParts(d).map((x) => [x.type, Number(x.value)]));
  return { ano: p.year, mes: p.month, dia: p.day, hora: p.hour, min: p.minute, seg: p.second };
}

// Diferença entre o relógio de Brasília e o UTC naquele instante (hoje -3 h; sobrevive a horário de verão).
function deslocamentoMs(d: Date) {
  const p = partes(d);
  return Date.UTC(p.ano, p.mes - 1, p.dia, p.hora, p.min, p.seg) - Math.floor(d.getTime() / 1000) * 1000;
}

// O instante em que o relógio de Brasília marca "hh:mm" no dia (ano, mes, dia).
function instante(ano: number, mes: number, dia: number, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const local = Date.UTC(ano, mes - 1, dia, h, m);
  const t = local - deslocamentoMs(new Date(local));
  return new Date(local - deslocamentoMs(new Date(t)));
}

// Horários de Brasília do dia de "agora" deslocado em "dias" (ex.: -1 = ontem), em ordem.
function horariosDoDia(horarios: readonly string[], agora: Date, dias: number): Date[] {
  const p = partes(agora);
  const base = new Date(Date.UTC(p.ano, p.mes - 1, p.dia + dias));
  return [...horarios].sort().map((h) => instante(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate(), h));
}

// Último horário agendado que já passou (<= agora).
export function ultimoHorario(horarios: readonly string[], agora = new Date()): Date {
  for (const dias of [0, -1]) {
    const passados = horariosDoDia(horarios, agora, dias).filter((d) => d.getTime() <= agora.getTime());
    if (passados.length > 0) return passados[passados.length - 1];
  }
  return horariosDoDia(horarios, agora, -2).at(-1)!;
}

// Próximo horário agendado depois de agora.
export function proximoHorario(horarios: readonly string[], agora = new Date()): Date {
  for (const dias of [0, 1]) {
    const futuro = horariosDoDia(horarios, agora, dias).find((d) => d.getTime() > agora.getTime());
    if (futuro) return futuro;
  }
  return horariosDoDia(horarios, agora, 2)[0];
}

// Vence quando um horário da agenda passou depois do início da última tentativa. Nunca rodou = já.
// Se o servidor estava fora no horário (deploy), roda assim que voltar, uma vez só.
// Uma execução que falhou espera o próximo horário (não martela uma fonte fora do ar).
export const estaVencido = (ultimoInicio: Date | null, horarios: readonly string[], agora = new Date()) =>
  !ultimoInicio || ultimoHorario(horarios, agora).getTime() > ultimoInicio.getTime();

export const proximaExecucao = (ultimoInicio: Date | null, horarios: readonly string[], agora = new Date()): Date =>
  estaVencido(ultimoInicio, horarios, agora) ? agora : proximoHorario(horarios, agora);
