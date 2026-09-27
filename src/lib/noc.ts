import 'server-only';

import { access, readdir, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { prisma } from './prisma';
import { estadoDosWorkers } from './workers/motor';
import type { EstadoWorker } from './workers/tipos';

export type NivelNoc = 'ok' | 'atencao' | 'erro';

export interface ItemNoc {
  nome: string;
  nivel: NivelNoc;
  resumo: string;
  detalhe?: string;
}

export interface EstadoNoc {
  geradoEm: string;
  nivel: NivelNoc;
  servicos: ItemNoc[];
  fontes: (ItemNoc & { grupo: string; ultimaExecucao: string | null; proximaExecucao: string | null })[];
  totais: { fontes: number; saudaveis: number; atencao: number; erros: number };
}

const pior = (niveis: NivelNoc[]): NivelNoc => niveis.includes('erro') ? 'erro' : niveis.includes('atencao') ? 'atencao' : 'ok';

function saudeWorker(worker: EstadoWorker, agora: Date): ItemNoc & { grupo: string; ultimaExecucao: string | null; proximaExecucao: string | null } {
  const ultima = worker.ultima;
  let nivel: NivelNoc = 'ok';
  let resumo = 'Operando normalmente';
  if (!worker.ativo) {
    nivel = 'atencao';
    resumo = 'Pausado';
  } else if (worker.pendencia) {
    nivel = 'atencao';
    resumo = 'Configuração pendente';
  } else if (ultima?.status === 'erro') {
    nivel = 'erro';
    resumo = 'Última execução falhou';
  } else if (worker.rodando) {
    resumo = 'Executando agora';
  } else if (!ultima) {
    nivel = 'atencao';
    resumo = 'Ainda não executado';
  } else if (worker.ultimoSucessoEm && agora.getTime() - new Date(worker.ultimoSucessoEm).getTime() > 36 * 60 * 60 * 1000) {
    nivel = 'atencao';
    resumo = 'Sem sucesso há mais de 36 horas';
  }
  return {
    nome: worker.nome,
    grupo: worker.grupo,
    nivel,
    resumo,
    detalhe: worker.pendencia ?? ultima?.mensagem ?? worker.descricao,
    ultimaExecucao: ultima?.iniciadoEm ?? null,
    proximaExecucao: worker.proximaEm,
  };
}

async function estadoBackup(): Promise<ItemNoc> {
  const dataDir = path.join(process.cwd(), 'data');
  const candidatas = [process.env.BACKUP_DIR, path.join(dataDir, 'backups'), path.join(dataDir, 'backup')].filter((p): p is string => Boolean(p));
  const arquivos: { nome: string; em: Date; tamanho: number }[] = [];
  for (const pasta of candidatas) {
    try {
      for (const item of await readdir(pasta, { withFileTypes: true })) {
        if (!item.isFile() || !/\.(bak|backup|db|sqlite|zip|gz)$/i.test(item.name)) continue;
        const info = await stat(path.join(pasta, item.name));
        arquivos.push({ nome: item.name, em: info.mtime, tamanho: info.size });
      }
    } catch {
      // Pasta ainda não configurada: o cartão abaixo informa a pendência.
    }
  }
  const ultimo = arquivos.sort((a, b) => b.em.getTime() - a.em.getTime())[0];
  if (!ultimo) return { nome: 'Backup', nivel: 'atencao', resumo: 'Nenhum backup detectado', detalhe: 'Configure o worker de backup para alimentar data/backups.' };
  const horas = (Date.now() - ultimo.em.getTime()) / 3_600_000;
  return {
    nome: 'Backup',
    nivel: horas > 36 ? 'atencao' : 'ok',
    resumo: horas > 36 ? 'Backup desatualizado' : 'Backup localizado',
    detalhe: `${ultimo.em.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · ${(ultimo.tamanho / 1_048_576).toFixed(1)} MB`,
  };
}

export async function carregarEstadoNoc(): Promise<EstadoNoc> {
  const agora = new Date();
  const dataDir = path.join(process.cwd(), 'data');
  const [banco, volume, backup, workers] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then((): ItemNoc => ({ nome: 'Banco de dados', nivel: 'ok', resumo: 'Conectado' })).catch((): ItemNoc => ({ nome: 'Banco de dados', nivel: 'erro', resumo: 'Sem conexão' })),
    access(dataDir, constants.R_OK | constants.W_OK).then((): ItemNoc => ({ nome: 'Volume de dados', nivel: 'ok', resumo: 'Disponível para leitura e gravação' })).catch((): ItemNoc => ({ nome: 'Volume de dados', nivel: 'erro', resumo: 'Indisponível ou sem permissão' })),
    estadoBackup(),
    estadoDosWorkers().catch(() => [] as EstadoWorker[]),
  ]);
  const fontes = workers.map((worker) => saudeWorker(worker, agora));
  const erroMotor: ItemNoc | null = workers.length === 0
    ? { nome: 'Agendador', nivel: 'erro', resumo: 'Não foi possível ler os workers' }
    : { nome: 'Agendador', nivel: pior(fontes.map((f) => f.nivel)), resumo: `${fontes.filter((f) => f.nivel === 'ok').length} de ${fontes.length} fontes saudáveis` };
  const servicos = [banco, volume, backup, erroMotor];
  const totais = {
    fontes: fontes.length,
    saudaveis: fontes.filter((f) => f.nivel === 'ok').length,
    atencao: fontes.filter((f) => f.nivel === 'atencao').length,
    erros: fontes.filter((f) => f.nivel === 'erro').length,
  };
  return { geradoEm: agora.toISOString(), nivel: pior([...servicos.map((s) => s.nivel), ...fontes.map((f) => f.nivel)]), servicos, fontes, totais };
}
