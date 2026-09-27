import 'server-only';
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { prisma } from '../prisma';
import { efetivado } from './baseClientes';
import { compararMeses } from './clientesNovos';
import type { ServidorPortal } from './clientesNovos';
import { percorrerCadastro } from './leitorPortal';

// Orquestra o mapeamento mensal: baixa o arquivo oficial "Servidores SIAPE" do Portal da
// Transparência, compara com o mês anterior e grava a lista de acionáveis. Arquivos ficam em
// data/transparencia/ (volume, fora do git): o .zip é apagado depois de lido; dos meses só guardamos
// os IDs (sem nome), o suficiente para a comparação seguinte.

const PASTA = path.join(process.cwd(), 'data', 'transparencia');
const MESES_DE_LISTA = 12; // listas mais antigas são apagadas (têm nome de pessoa)
const LOTE = 500;

// URL do "Download de dados → Servidores" ({AAAAMM} = mês). A CONFIRMAR com o arquivo real (rede
// bloqueada no ambiente de desenvolvimento): o Portal redireciona para o .zip do mês. Se o Portal
// mudar o endereço, PORTAL_SERVIDORES_URL troca sem novo deploy (e serve para simular nos testes).
const URL_PADRAO = 'https://portaldatransparencia.gov.br/download-de-dados/servidores/{AAAAMM}_Servidores_SIAPE';
export const urlDoMes = (mes: string) => (process.env.PORTAL_SERVIDORES_URL?.trim() || URL_PADRAO).replace('{AAAAMM}', mes.replace('-', ''));

const arquivoIds = (mes: string) => path.join(PASTA, `ids-${mes}.txt`);

export function mesDeslocado(mes: string, n: number): string {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

// Mês corrente em Brasília (AAAA-MM).
export function mesAtual(agora = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(agora);
}

// null = o Portal ainda não publicou esse mês.
async function baixarZip(mes: string): Promise<string | null> {
  await mkdir(PASTA, { recursive: true });
  const r = await fetch(urlDoMes(mes), { redirect: 'follow', signal: AbortSignal.timeout(30 * 60_000) }).catch((e: unknown) => {
    const causa = e instanceof Error ? ((e.cause as Error | undefined)?.message ?? e.message) : String(e);
    throw new Error(`Não foi possível conectar ao Portal da Transparência para baixar ${mes} (${causa}).`);
  });
  if (r.status === 404) return null;
  if (!r.ok || !r.body) throw new Error(`Portal respondeu HTTP ${r.status} ao baixar ${mes}.`);
  const tipo = r.headers.get('content-type') ?? '';
  if (tipo.includes('text/html')) return null; // página "arquivo não disponível" em vez do .zip
  const destino = path.join(PASTA, `${mes}.zip`);
  await pipeline(Readable.fromWeb(r.body as unknown as WebReadableStream), createWriteStream(destino));
  return destino;
}

// Linhas do <AAAAMM>_Cadastro.csv de dentro do .zip, em fluxo (o arquivo é ISO-8859-1).
async function* linhasDoCadastro(zip: string): AsyncGenerator<string> {
  const unzip = spawn('unzip', ['-p', zip, '*_Cadastro.csv']);
  let erro = '';
  unzip.stderr.on('data', (d) => (erro += String(d)));
  const fim = new Promise<number>((ok) => unzip.on('close', (c) => ok(c ?? 1)));
  unzip.stdout.setEncoding('latin1');
  yield* createInterface({ input: unzip.stdout, crlfDelay: Infinity });
  const codigo = await fim;
  if (codigo !== 0) throw new Error(`Não foi possível abrir o arquivo do Portal (unzip ${codigo}): ${erro.slice(0, 200)}`);
}

async function lerIds(mes: string): Promise<Set<string> | null> {
  try {
    return new Set((await readFile(arquivoIds(mes), 'utf-8')).split('\n').filter(Boolean));
  } catch {
    return null;
  }
}

// "Já é cliente" no mês da lista = tinha contrato efetivado ANTES do mês começar. Contratos de
// depois são justamente os acionados que fecharam: contá-los aqui apagaria da lista quem converteu
// (e zeraria o indicador). Linha sem data vale como cliente antigo.
async function nossaBase(mes: string): Promise<Set<string>> {
  const linhas = await prisma.baseCliente.findMany({
    where: { OR: [{ data: '' }, { data: { lt: `${mes}-01` } }] },
    select: { chave: true, status: true },
  });
  return new Set(linhas.filter((l) => efetivado(l.status)).map((l) => l.chave));
}

// Guarda só os 2 últimos meses de IDs.
async function podar(mesMaisRecente: string) {
  const manter = new Set([arquivoIds(mesMaisRecente), arquivoIds(mesDeslocado(mesMaisRecente, -1))].map((p) => path.basename(p)));
  for (const f of await readdir(PASTA).catch(() => [] as string[])) {
    if (f.startsWith('ids-') && !manter.has(f)) await rm(path.join(PASTA, f), { force: true });
  }
  const limite = mesDeslocado(mesMaisRecente, -MESES_DE_LISTA);
  await prisma.portalNovo.deleteMany({ where: { mes: { lt: limite } } });
}

export type ResultadoProcesso =
  | { situacao: 'indisponivel'; mes: string }
  | { situacao: 'base'; mes: string; servidores: number }
  | { situacao: 'processado'; mes: string; servidores: number; entraram: number; jaClientes: number; acionaveis: number };

// Processa um mês. Sem os IDs do mês anterior, só registra este como base (não gera lista).
export async function processarMes(mes: string): Promise<ResultadoProcesso> {
  const zip = await baixarZip(mes);
  if (!zip) return { situacao: 'indisponivel', mes };
  try {
    const anteriores = await lerIds(mesDeslocado(mes, -1));
    const ids = new Set<string>();
    const candidatos: ServidorPortal[] = [];
    const { ignoradas } = await percorrerCadastro(linhasDoCadastro(zip), (s) => {
      ids.add(s.id);
      if (anteriores && !anteriores.has(s.id)) candidatos.push(s);
    });
    if (ids.size === 0) throw new Error(`Arquivo de ${mes} sem servidores legíveis.`);
    await writeFile(arquivoIds(mes), [...ids].join('\n'));
    if (!anteriores) return { situacao: 'base', mes, servidores: ids.size };

    const r = compararMeses(mes, candidatos, anteriores, await nossaBase(mes), ids.size);
    await prisma.$transaction(async (tx) => {
      await tx.portalNovo.deleteMany({ where: { mes } });
      for (let i = 0; i < r.acionaveis.length; i += LOTE) {
        await tx.portalNovo.createMany({
          data: r.acionaveis.slice(i, i + LOTE).map((n) => ({
            mes,
            servidorId: n.id,
            nome: n.nome,
            cpf6: n.cpf6,
            orgao: n.orgao,
            orgaoSuperior: n.orgaoSuperior,
            uf: n.uf,
            cargo: n.cargo,
            situacao: n.situacao,
            ingressoCargo: n.ingressoCargo,
            tipo: n.tipo,
            chave: n.chave,
          })),
        });
      }
      const resumo = { totalServidores: r.totalServidores, entraram: r.entraram, jaClientes: r.jaClientes, acionaveis: r.acionaveis.length, ignoradas };
      await tx.portalMes.upsert({ where: { mes }, create: { mes, ...resumo }, update: { ...resumo, processadoEm: new Date() } });
    });
    await podar(mes);
    return { situacao: 'processado', mes, servidores: r.totalServidores, entraram: r.entraram, jaClientes: r.jaClientes, acionaveis: r.acionaveis.length };
  } finally {
    await rm(zip, { force: true });
  }
}

// Chamado pelo worker. O Portal publica o mês M por volta da metade de M+1: olha os 2 meses
// anteriores ao atual e processa o que ainda não foi feito, em ordem. No 1º uso, baixa também o mês
// de antes para servir de base, e a primeira lista já sai completa.
export async function atualizarMapeamento(agora = new Date()) {
  const atual = mesAtual(agora);
  const candidatos = [mesDeslocado(atual, -2), mesDeslocado(atual, -1)];
  const feitos = new Set((await prisma.portalMes.findMany({ where: { mes: { in: candidatos } }, select: { mes: true } })).map((m) => m.mes));
  const resultados: ResultadoProcesso[] = [];
  for (const mes of candidatos) {
    if (feitos.has(mes)) continue;
    if (!(await lerIds(mesDeslocado(mes, -1)))) {
      const base = await processarMes(mesDeslocado(mes, -1));
      resultados.push(base);
      if (base.situacao === 'indisponivel') continue;
    }
    resultados.push(await processarMes(mes));
  }
  return resultados;
}
