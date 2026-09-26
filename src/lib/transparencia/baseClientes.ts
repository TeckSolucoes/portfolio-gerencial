import { chavePessoa } from './clientesNovos';
import { dataBr, partirLinha } from './leitorPortal';

// Importa a NOSSA base (export do Front ou SELECT do Função) enviada pelo superadmin. Só sai daqui o
// hash da pessoa (6 dígitos do meio do CPF + nome), a data, o valor e o status: CPF e nome não são
// guardados. As colunas são achadas pelo nome, com apelidos, para aceitar as duas fontes.

const COLUNAS = {
  cpf: ['CPF', 'CPF_CLIENTE', 'NR_CPF', 'CPF CLIENTE'],
  nome: ['NOME', 'NOME_CLIENTE', 'CLIENTE', 'NOME CLIENTE'],
  data: ['DATA_CONTRATO', 'DATA', 'DATA_CADASTRO', 'DATA_INSERCAO', 'DATA DE CADASTRO', 'DT_CONTRATO'],
  valor: ['VALOR', 'VALOR_LIBERADO', 'VALOR_CONTRATO', 'VLR_LIBERADO', 'VALOR LIBERADO', 'CONTRATO'],
  status: ['STATUS', 'SITUACAO', 'STATUS_PROPOSTA'],
} as const;
type Campo = keyof typeof COLUNAS;

// Status que contam como "fechou contrato" no indicador. A CONFIRMAR com o SELECT do Função
// (SELECT DISTINCT status): por ora, o que indica contrato pago/averbado/integrado.
export const STATUS_EFETIVADO = /PAG|INTEGRAD|EFETIV|AVERBAD|FINALIZAD|CONCLUID/;

export interface LinhaBase {
  chave: string;
  data: string; // YYYY-MM-DD ou '' (sem data: vale para "já é cliente", não para o indicador)
  valor: number;
  status: string;
}

export interface ImportacaoBase {
  linhas: LinhaBase[];
  ignoradas: number;
  colunas: Partial<Record<Campo, string>>; // qual coluna do arquivo foi usada para cada campo
  status: { status: string; qtd: number }[]; // para o superadmin conferir o que conta como fechado
}

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const normCab = (s: string) => semAcento(s.replace(/^﻿/, '')).trim().toUpperCase();

// "12.500,00" / "12500.00" / "R$ 12.500" -> 12500
export function valorBr(v: string): number {
  let t = v.replace(/[^\d,.-]/g, '');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

// Aceita dd/mm/aaaa, aaaa-mm-dd e aaaa-mm-dd hh:mm:ss.
export function dataQualquer(v: string): string {
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(v.trim());
  return iso ? iso[1] : dataBr(v.trim().slice(0, 10));
}

export function detectarSeparador(cabecalho: string): string {
  const conta = (s: string) => cabecalho.split(s).length;
  return [';', '\t', ','].reduce((melhor, s) => (conta(s) > conta(melhor) ? s : melhor), ';');
}

export function importarBase(texto: string): ImportacaoBase {
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim());
  if (linhas.length === 0) throw new Error('Arquivo vazio.');
  const sep = detectarSeparador(linhas[0]);
  const cab = partirLinha(linhas[0], sep).map(normCab);
  const idx = {} as Record<Campo, number>;
  const colunas: Partial<Record<Campo, string>> = {};
  for (const campo of Object.keys(COLUNAS) as Campo[]) {
    idx[campo] = COLUNAS[campo].map((n) => cab.indexOf(n)).find((i) => i >= 0) ?? -1;
    if (idx[campo] >= 0) colunas[campo] = cab[idx[campo]];
  }
  const faltando = (['cpf', 'nome'] as Campo[]).filter((c) => idx[c] < 0);
  if (faltando.length) throw new Error(`Faltam as colunas: ${faltando.map((c) => COLUNAS[c][0]).join(', ')}. Colunas encontradas: ${cab.join(', ')}.`);

  const saida: LinhaBase[] = [];
  const porStatus = new Map<string, number>();
  let ignoradas = 0;
  for (const l of linhas.slice(1)) {
    const c = partirLinha(l, sep);
    const v = (campo: Campo) => (idx[campo] >= 0 ? (c[idx[campo]] ?? '') : '');
    const chave = chavePessoa(v('cpf'), v('nome'));
    if (!chave) {
      ignoradas++;
      continue;
    }
    const status = semAcento(v('status')).trim().toUpperCase();
    porStatus.set(status, (porStatus.get(status) ?? 0) + 1);
    saida.push({ chave, data: dataQualquer(v('data')), valor: valorBr(v('valor')), status });
  }
  const status = [...porStatus].map(([s, qtd]) => ({ status: s || '(sem status)', qtd })).sort((a, b) => b.qtd - a.qtd);
  return { linhas: saida, ignoradas, colunas, status };
}

// Sem coluna de status, toda linha conta como contrato (o arquivo já deve vir filtrado).
export const efetivado = (status: string) => !status || STATUS_EFETIVADO.test(status);
