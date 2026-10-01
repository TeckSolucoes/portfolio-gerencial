import 'server-only';

import type { RowDataPacket } from 'mysql2/promise';
import { criarCache } from '@/lib/cache/memoria';
import { consultarFrontV2 } from '@/lib/bases/conexoes';
import type { Empresa } from '@/lib/empresas';
import { agruparPorResponsavel, type PessoaMonitorada, type PropostaMonitorada } from './operacional';

interface LinhaMonitoramento extends RowDataPacket {
  id: string | number;
  gerente: string | null;
  equipe: string | null;
  operador: string | null;
  convenio: string | null;
  criada_em: string;
  atualizada_em: string;
  status_front: string | null;
  status_funcao: string | null;
  esteira: string | null;
  motivo: string | null;
  codigo_funcao: string | null;
}

export interface MonitoramentoAoVivo {
  atualizadoEm: string;
  pessoas: PessoaMonitorada[];
  casos: number;
  objecoes: number;
  semAtualizacao: number;
  semResponsavel: number;
}

const cache = criarCache<MonitoramentoAoVivo>();
const TTL_MS = 3 * 60 * 1000;
const hojeSp = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

async function buscar(empresas: Empresa[], escopoGerente: string | null): Promise<MonitoramentoAoVivo> {
  const prefixos = empresas.map((empresa) => (empresa === 'AKRK' ? 'AKRK - %' : 'DIG - %'));
  const filtrosEmpresa = prefixos.map(() => 't.Equipe LIKE ?').join(' OR ');
  const filtroGerente = escopoGerente ? ' AND UPPER(t.Gerente) LIKE UPPER(?)' : '';
  const parametros: unknown[] = [...prefixos];
  if (escopoGerente) parametros.push(`${escopoGerente.trim().split(/\s+/)[0]}%`);

  const linhas = await consultarFrontV2<LinhaMonitoramento[]>(
    `SELECT
       ap.id,
       t.Gerente AS gerente,
       t.Equipe AS equipe,
       t.Operador AS operador,
       cf.nome_convenio AS convenio,
       DATE_FORMAT(ap.created_at, '%Y-%m-%d') AS criada_em,
       DATE_FORMAT(COALESCE(ap.dataUltimaAtualizacaoFuncao, ap.created_at), '%Y-%m-%d') AS atualizada_em,
       ap.status AS status_front,
       ap.fStatus AS status_funcao,
       ap.fEsteira AS esteira,
       ap.motivoCancelamentoFuncao AS motivo,
       NULLIF(TRIM(ap.codigoPropostaExterna), '') AS codigo_funcao
     FROM \`db-atendimento\`.v_tab_atendimento t
     JOIN \`db-atendimento\`.atendimento_propostas ap ON ap.id = t.id_front
     LEFT JOIN \`db-empresa\`.v_convenio_formatado cf ON cf.id_convenio = ap.convenio
     WHERE ap.created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
       AND ap.deleted_at IS NULL
       AND (${filtrosEmpresa})${filtroGerente}
       AND (
         NULLIF(TRIM(ap.motivoCancelamentoFuncao), '') IS NOT NULL
         OR UPPER(CONCAT_WS(' ', ap.status, ap.fStatus, ap.fEsteira)) REGEXP 'REPROV|RECUSAD|NEGAD'
         OR NULLIF(TRIM(t.Operador), '') IS NULL
         OR (NULLIF(TRIM(ap.codigoPropostaExterna), '') IS NOT NULL AND NULLIF(TRIM(ap.fStatus), '') IS NULL AND NULLIF(TRIM(ap.fEsteira), '') IS NULL)
         OR COALESCE(ap.dataUltimaAtualizacaoFuncao, ap.created_at) < DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY)
       )
     GROUP BY ap.id
     ORDER BY ap.created_at DESC
     LIMIT 12001`,
    parametros,
  );
  if (linhas.length > 12000) throw new Error('O monitoramento ultrapassou 12 mil propostas no período.');

  const propostas: PropostaMonitorada[] = linhas.map((linha) => ({
    id: String(linha.id),
    gerente: String(linha.gerente ?? ''),
    equipe: String(linha.equipe ?? ''),
    operador: String(linha.operador ?? ''),
    convenio: String(linha.convenio ?? ''),
    criadaEm: linha.criada_em,
    atualizadaEm: linha.atualizada_em,
    statusFront: String(linha.status_front ?? ''),
    statusFuncao: String(linha.status_funcao ?? ''),
    esteira: String(linha.esteira ?? ''),
    motivo: String(linha.motivo ?? ''),
    temCodigoFuncao: Boolean(linha.codigo_funcao),
  }));
  const pessoas = agruparPorResponsavel(propostas, hojeSp());
  return {
    atualizadoEm: new Date().toISOString(),
    pessoas,
    casos: pessoas.reduce((total, pessoa) => total + pessoa.casos, 0),
    objecoes: pessoas.reduce((total, pessoa) => total + pessoa.objecoes, 0),
    semAtualizacao: pessoas.reduce((total, pessoa) => total + pessoa.semAtualizacao, 0),
    semResponsavel: pessoas.reduce((total, pessoa) => total + pessoa.semResponsavel, 0),
  };
}

export async function carregarMonitoramentoAoVivo(empresas: Empresa[], escopoGerente: string | null) {
  const chave = `${[...empresas].sort().join(',')}:${escopoGerente ?? 'geral'}`;
  return cache.obter(chave, TTL_MS, () => buscar(empresas, escopoGerente));
}
