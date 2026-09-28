import 'server-only';
import { prisma } from '../prisma';
import { apagarCache, gravarCache } from './cache';
import { WORKERS, workerPorId } from './registro';
import { estaVencido, HORARIOS_PADRAO, lerHorarios, normalizarHorarios, proximaExecucao } from './tipos';
import type { EstadoWorker, StatusExecucao, Worker } from './tipos';

const TICK_MS = 30_000;
const ATRASO_INICIAL_MS = 20_000; // deixa o servidor terminar de subir antes da 1ª rodada
const LIMITE_EXECUCAO_MS = 5 * 60_000; // um worker que trava não segura os outros para sempre
const SIMULTANEOS = 2;
const HISTORICO_POR_WORKER = 100;

const g = globalThis as unknown as { __workersAgendador?: boolean; __workersRodando?: Set<string> };
const rodando = () => (g.__workersRodando ??= new Set<string>());

const comLimite = <T,>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    p,
    new Promise<never>((_, falha) => setTimeout(() => falha(new Error(`Passou de ${Math.round(ms / 60000)} min e foi interrompido.`)), ms)),
  ]);

export async function executarWorker(id: string, origem: 'agendado' | 'manual'): Promise<'executado' | 'ja-rodando' | 'inexistente' | 'pendente'> {
  const w = workerPorId(id);
  if (!w) return 'inexistente';
  if (w.pendencia?.()) return 'pendente';
  if (rodando().has(id)) return 'ja-rodando';
  rodando().add(id);

  const inicio = new Date();
  const registro = await prisma.workerExecucao.create({ data: { workerId: id, iniciadoEm: inicio, status: 'rodando', origem } });
  let status: StatusExecucao = 'ok';
  let itens: number | null = null;
  let mensagem: string | null = null;
  try {
    const r = await comLimite(w.executar(), w.limiteMs ?? LIMITE_EXECUCAO_MS);
    await gravarCache(id, r.dados);
    itens = r.itens;
    mensagem = r.mensagem;
  } catch (e) {
    status = 'erro';
    mensagem = e instanceof Error ? e.message.slice(0, 300) : 'Falha na coleta.';
  } finally {
    rodando().delete(id);
    await prisma.workerExecucao
      .update({ where: { id: registro.id }, data: { terminadoEm: new Date(), status, itens, mensagem } })
      .catch(() => undefined);
    await podarHistorico(id).catch(() => undefined);
  }
  return 'executado';
}

async function podarHistorico(workerId: string) {
  const antigas = await prisma.workerExecucao.findMany({
    where: { workerId },
    orderBy: { iniciadoEm: 'desc' },
    skip: HISTORICO_POR_WORKER,
    select: { id: true },
  });
  if (antigas.length > 0) await prisma.workerExecucao.deleteMany({ where: { id: { in: antigas.map((a) => a.id) } } });
}

// Linha especial de worker_configs com a agenda que vale para quem não tem horários próprios.
const ID_PADRAO = '__padrao__';

async function configs() {
  const linhas = await prisma.workerConfig.findMany();
  const porId = new Map(linhas.map((c) => [c.id, c]));
  const padrao = lerHorarios(porId.get(ID_PADRAO)?.horarios) ?? [...HORARIOS_PADRAO];
  const agendaDe = (id: string) => {
    const proprios = lerHorarios(porId.get(id)?.horarios);
    return { horarios: proprios ?? padrao, proprios: proprios !== null };
  };
  return { porId, padrao, agendaDe };
}

export async function agendaPadrao(): Promise<string[]> {
  return (await configs()).padrao;
}

// Última execução de cada worker numa consulta só (mais rápido que uma por worker).
async function ultimas() {
  const linhas = await prisma.workerExecucao.findMany({ orderBy: { iniciadoEm: 'desc' }, take: WORKERS.length * 8 });
  const porWorker = new Map<string, (typeof linhas)[number]>();
  const sucesso = new Map<string, Date>();
  for (const l of linhas) {
    if (!porWorker.has(l.workerId)) porWorker.set(l.workerId, l);
    if (l.status === 'ok' && !sucesso.has(l.workerId)) sucesso.set(l.workerId, l.terminadoEm ?? l.iniciadoEm);
  }
  return { porWorker, sucesso };
}

export async function estadoDosWorkers(): Promise<EstadoWorker[]> {
  const [cfg, { porWorker, sucesso }] = await Promise.all([configs(), ultimas()]);
  const agora = new Date();
  return WORKERS.map((w) => {
    const ativo = cfg.porId.get(w.id)?.ativo ?? true;
    const agenda = cfg.agendaDe(w.id);
    const u = porWorker.get(w.id) ?? null;
    const pendencia = w.pendencia?.() ?? null;
    const rodandoAgora = rodando().has(w.id) || u?.status === 'rodando';
    return {
      id: w.id,
      nome: w.nome,
      grupo: w.grupo,
      descricao: w.descricao,
      ativo,
      horarios: agenda.horarios,
      horariosProprios: agenda.proprios,
      pendencia,
      rodando: rodandoAgora,
      ultima: u && {
        status: u.status as StatusExecucao,
        iniciadoEm: u.iniciadoEm.toISOString(),
        terminadoEm: u.terminadoEm?.toISOString() ?? null,
        duracaoMs: u.terminadoEm ? u.terminadoEm.getTime() - u.iniciadoEm.getTime() : null,
        itens: u.itens,
        mensagem: u.mensagem,
        origem: u.origem,
      },
      ultimoSucessoEm: sucesso.get(w.id)?.toISOString() ?? null,
      proximaEm: !ativo || pendencia || rodandoAgora ? null : proximaExecucao(u?.iniciadoEm ?? null, agenda.horarios, agora).toISOString(),
    };
  });
}

export async function definirAtivo(id: string, ativo: boolean) {
  if (!workerPorId(id)) throw new Error('Worker inexistente.');
  await prisma.workerConfig.upsert({ where: { id }, create: { id, ativo }, update: { ativo } });
}

export async function limparHistoricoWorker(id: string) {
  if (!workerPorId(id)) throw new Error('Worker inexistente.');
  if (rodando().has(id)) throw new Error('Aguarde a execução terminar antes de limpar.');

  const fonteJuridica: Record<string, string | undefined> = {
    'juridico-cadastro': 'cadastro',
    'juridico-internet': 'internet',
    'juridico-processos': 'processos',
    'juridico-licitacoes': 'licitacoes',
    'juridico-sancoes': 'sancoes',
  };
  const fonte = fonteJuridica[id];
  const operacoes = [prisma.workerExecucao.deleteMany({ where: { workerId: id } })];
  if (fonte) {
    operacoes.push(prisma.juridicoFonteStatus.deleteMany({ where: { fonte } }));
    operacoes.push(prisma.juridicoEvento.deleteMany({ where: { fonte } }));
  }
  await prisma.$transaction(operacoes);
  await apagarCache(id);
}

// null = o worker volta a seguir a agenda padrão.
export async function definirHorarios(id: string, horarios: string[] | null) {
  if (!workerPorId(id)) throw new Error('Worker inexistente.');
  const valor = horarios === null ? null : normalizarHorarios(horarios).join(',');
  await prisma.workerConfig.upsert({ where: { id }, create: { id, horarios: valor }, update: { horarios: valor } });
}

// Muda a agenda de todos os workers que não têm horários próprios.
export async function definirAgendaPadrao(horarios: string[]) {
  const valor = normalizarHorarios(horarios).join(',');
  await prisma.workerConfig.upsert({ where: { id: ID_PADRAO }, create: { id: ID_PADRAO, horarios: valor }, update: { horarios: valor } });
}

async function rodada() {
  const [cfg, { porWorker }] = await Promise.all([configs(), ultimas()]);
  const agora = new Date();
  const vencidos: Worker[] = WORKERS.filter((w) => {
    if (!(cfg.porId.get(w.id)?.ativo ?? true) || w.pendencia?.() || rodando().has(w.id)) return false;
    return estaVencido(porWorker.get(w.id)?.iniciadoEm ?? null, cfg.agendaDe(w.id).horarios, agora);
  });
  const fila = [...vencidos];
  const trabalhar = async () => {
    for (let w = fila.shift(); w; w = fila.shift()) await executarWorker(w.id, 'agendado').catch(() => undefined);
  };
  await Promise.all(Array.from({ length: Math.min(SIMULTANEOS, fila.length) }, trabalhar));
}

// Chamado uma vez pelo instrumentation.ts quando o servidor sobe. Não bloqueia o boot.
export function iniciarAgendador() {
  if (g.__workersAgendador) return;
  g.__workersAgendador = true;

  // Execução marcada "rodando" de um processo que caiu (deploy, crash) nunca vai terminar.
  void prisma.workerExecucao
    .updateMany({
      where: { status: 'rodando' },
      data: { status: 'erro', terminadoEm: new Date(), mensagem: 'Interrompido (o servidor reiniciou durante a coleta).' },
    })
    .catch(() => undefined);

  let emAndamento = false;
  const tick = () => {
    if (emAndamento) return;
    emAndamento = true;
    rodada()
      .catch(() => undefined)
      .finally(() => {
        emAndamento = false;
      });
  };
  setTimeout(tick, ATRASO_INICIAL_MS).unref();
  setInterval(tick, TICK_MS).unref();
}
