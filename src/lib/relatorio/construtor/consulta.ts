import 'server-only';

import type { RowDataPacket } from 'mysql2/promise';
import { consultarFrontV2, consultarFuncaoEmLotes } from '@/lib/bases/conexoes';
import { campoRelatorio, validarVisao, type IdCampoRelatorio, type TipoGrafico } from './catalogo';
import {
  agregarConciliado,
  resumirConciliacao,
  type PontoConciliado,
  type PropostaFrontRelatorio,
  type PropostaFuncaoRelatorio,
  type ResumoConciliacao,
} from './conciliacao';

interface LinhaFront extends RowDataPacket, PropostaFrontRelatorio {}
interface LinhaFuncao extends RowDataPacket, PropostaFuncaoRelatorio {}
interface LinhaAgregada extends RowDataPacket { rotulo: string | null; valor: string | number | null }

export type PontoVisao = PontoConciliado;

export interface ConsultaVisao {
  dimensao: IdCampoRelatorio | null;
  metrica: IdCampoRelatorio;
  grafico: TipoGrafico;
  inicio: string;
  fim: string;
  empresa: string;
}

export interface ResultadoVisao {
  pontos: PontoVisao[];
  conciliacao: ResumoConciliacao | null;
}

export interface PainelFixo {
  conciliacao: ResumoConciliacao;
  propostas: number;
  valorContratado: number;
  valorLiberado: number;
  taxaIntegracao: number;
  propostasPorHora: PontoVisao[];
  funilFuncao: PontoVisao[];
  rankingEquipes: PontoVisao[];
}

const TAMANHO_LOTE_FUNCAO = 800;
const LIMITE_PROPOSTAS_FRONT = 100_000;

const DIMENSOES_FRONT: Partial<Record<IdCampoRelatorio, string>> = {
  hora_cadastro: "DATE_FORMAT(base.data_cadastro, '%Y-%m-%d %H:00')",
  dia_cadastro: 'DATE(base.data_cadastro)',
  gerente: "COALESCE(NULLIF(TRIM(base.gerente), ''), '(não informado)')",
  equipe: "COALESCE(NULLIF(TRIM(base.equipe), ''), '(não informado)')",
  operador: "COALESCE(NULLIF(TRIM(base.operador), ''), '(não informado)')",
  convenio: "COALESCE(NULLIF(TRIM(base.convenio), ''), '(não informado)')",
  produto: "COALESCE(NULLIF(TRIM(base.produto), ''), '(não informado)')",
  modalidade: "COALESCE(NULLIF(TRIM(base.modalidade), ''), '(não informado)')",
  status_front: "COALESCE(NULLIF(TRIM(base.status_front), ''), '(não informado)')",
};

const METRICAS_FRONT: Partial<Record<IdCampoRelatorio, string>> = {
  qtd_propostas: 'COUNT(base.id_front)',
  valor_contratado: 'SUM(base.valor_contrato)',
  ticket_medio: 'SUM(base.valor_contrato) / NULLIF(COUNT(base.id_front), 0)',
};

export function validarPeriodo(inicio: string, fim: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim)) throw new Error('Período inválido.');
  const a = new Date(`${inicio}T00:00:00Z`);
  const b = new Date(`${fim}T00:00:00Z`);
  const dias = Math.floor((b.getTime() - a.getTime()) / 86_400_000);
  if (!Number.isFinite(dias) || dias < 0) throw new Error('A data final deve ser posterior à inicial.');
  if (dias > 91) throw new Error('Escolha um período de até 92 dias.');
}

const lotesDe = (itens: string[], tamanho: number) => {
  const lotes: string[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) lotes.push(itens.slice(i, i + tamanho));
  return lotes;
};

async function consultarRecorteFront(pedido: ConsultaVisao): Promise<LinhaFront[]> {
  const prefixoEquipe = pedido.empresa === 'AKRK' ? 'AKRK - %' : pedido.empresa === 'DIG' ? 'DIG - %' : '__sem_acesso__';
  const linhas = await consultarFrontV2<LinhaFront[]>(
    `SELECT
       ap.id AS id_front,
       NULLIF(TRIM(ap.codigoPropostaExterna), '') AS numero_proposta,
       DATE_FORMAT(ap.created_at, '%Y-%m-%d %H:00') AS hora_cadastro,
       DATE_FORMAT(ap.created_at, '%Y-%m-%d') AS dia_cadastro,
       COALESCE(NULLIF(TRIM(t.Gerente), ''), '(não informado)') AS gerente,
       COALESCE(NULLIF(TRIM(t.Equipe), ''), '(não informado)') AS equipe,
       COALESCE(NULLIF(TRIM(t.Operador), ''), '(não informado)') AS operador,
       COALESCE(NULLIF(TRIM(cf.nome_convenio), ''), '(não informado)') AS convenio,
       COALESCE(NULLIF(TRIM(pd.descricao), ''), '(não informado)') AS produto,
       COALESCE(NULLIF(TRIM(md.nome), ''), '(não informado)') AS modalidade,
       COALESCE(NULLIF(TRIM(ap.status), ''), '(não informado)') AS status_front,
       NULLIF(TRIM(ap.fStatus), '') AS status_funcao_v2,
       NULLIF(TRIM(ap.fEsteira), '') AS esteira_funcao_v2,
       COALESCE(ap.valorTotalContratado, 0) / 100 AS valor_contrato
     FROM \`db-atendimento\`.v_tab_atendimento t
     JOIN \`db-atendimento\`.atendimento_propostas ap ON ap.id = t.id_front
     LEFT JOIN \`db-empresa\`.v_convenio_formatado cf ON cf.id_convenio = ap.convenio
     LEFT JOIN \`db-empresa\`.produtos pd ON pd.id = ap.tipoOperacao
     LEFT JOIN \`db-tabela\`.tabela_simulacao ts ON ts.id = ap.tabela
     LEFT JOIN \`db-tabela\`.tabela_simulacao_modalidade md ON md.id = ts.idModalidade
     WHERE ap.created_at >= ? AND ap.created_at < DATE_ADD(?, INTERVAL 1 DAY)
       AND t.Equipe LIKE ? AND ap.deleted_at IS NULL
     GROUP BY ap.id
     LIMIT ${LIMITE_PROPOSTAS_FRONT + 1}`,
    [pedido.inicio, pedido.fim, prefixoEquipe],
  );
  if (linhas.length > LIMITE_PROPOSTAS_FRONT) throw new Error('O período retornou mais de 100 mil propostas. Reduza o intervalo.');
  return linhas;
}

export async function consultarSomentePropostasDaFuncao(numeros: string[]): Promise<LinhaFuncao[]> {
  const consultas = lotesDe([...new Set(numeros)].filter(Boolean), TAMANHO_LOTE_FUNCAO).map((lote) => {
    const marcadores = lote.map(() => '?').join(', ');
    return {
      sql: `WITH liberacoes AS (
              SELECT NumeroProposta, SUM(Valor) AS valor_liberado
              FROM releases
              WHERE deleted_at IS NULL AND NumeroProposta IN (${marcadores})
              GROUP BY NumeroProposta
            )
            SELECT
              p.NumeroProposta,
              p.SituacaoPropostaEsteira AS status_funcao_raw,
              f.SituacaoEsteira AS status_funcao,
              COALESCE(NULLIF(f.last_activity_description, ''), NULLIF(f.Descricao, ''), f.SituacaoEsteira) AS esteira_funcao,
              COALESCE(l.valor_liberado, 0) AS valor_liberado
            FROM proposals p
            LEFT JOIN function_mat_information f
              ON f.NumeroProposta = p.NumeroProposta AND f.deleted_at IS NULL
            LEFT JOIN liberacoes l ON l.NumeroProposta = p.NumeroProposta
            WHERE p.deleted_at IS NULL AND p.NumeroProposta IN (${marcadores})`,
      parametros: [...lote, ...lote],
    };
  });
  if (!consultas.length) return [];
  return consultarFuncaoEmLotes<LinhaFuncao>(consultas);
}

export async function executarVisao(pedido: ConsultaVisao): Promise<ResultadoVisao> {
  validarPeriodo(pedido.inicio, pedido.fim);
  const { dimensao, metrica } = validarVisao(pedido.dimensao, pedido.metrica, pedido.grafico);
  const expressaoMetrica = METRICAS_FRONT[metrica.id as IdCampoRelatorio];
  const expressaoDimensao = dimensao ? DIMENSOES_FRONT[dimensao.id as IdCampoRelatorio] : null;
  if (expressaoMetrica && (!dimensao || expressaoDimensao)) {
    const prefixoEquipe = pedido.empresa === 'AKRK' ? 'AKRK - %' : pedido.empresa === 'DIG' ? 'DIG - %' : '__sem_acesso__';
    const rotulo = expressaoDimensao ?? "'Total'";
    const agrupamento = expressaoDimensao ? `GROUP BY ${expressaoDimensao}` : '';
    const ordem = expressaoDimensao
      ? (dimensao?.tipo === 'tempo' ? 'ORDER BY rotulo ASC' : 'ORDER BY valor DESC, rotulo ASC')
      : '';
    const linhas = await consultarFrontV2<LinhaAgregada[]>(
      `SELECT ${rotulo} AS rotulo, ${expressaoMetrica} AS valor
       FROM (
         SELECT ap.id AS id_front, ap.created_at AS data_cadastro,
           t.Gerente AS gerente, t.Equipe AS equipe, t.Operador AS operador,
           cf.nome_convenio AS convenio, pd.descricao AS produto, md.nome AS modalidade,
           ap.status AS status_front, COALESCE(ap.valorTotalContratado, 0) / 100 AS valor_contrato
         FROM \`db-atendimento\`.v_tab_atendimento t
         JOIN \`db-atendimento\`.atendimento_propostas ap ON ap.id = t.id_front
         LEFT JOIN \`db-empresa\`.v_convenio_formatado cf ON cf.id_convenio = ap.convenio
         LEFT JOIN \`db-empresa\`.produtos pd ON pd.id = ap.tipoOperacao
         LEFT JOIN \`db-tabela\`.tabela_simulacao ts ON ts.id = ap.tabela
         LEFT JOIN \`db-tabela\`.tabela_simulacao_modalidade md ON md.id = ts.idModalidade
         WHERE ap.created_at >= ? AND ap.created_at < DATE_ADD(?, INTERVAL 1 DAY)
           AND t.Equipe LIKE ? AND ap.deleted_at IS NULL
         GROUP BY ap.id
       ) base
       ${agrupamento} ${ordem} LIMIT 50`,
      [pedido.inicio, pedido.fim, prefixoEquipe],
    );
    return {
      pontos: linhas.map((linha) => ({ rotulo: String(linha.rotulo ?? '(não informado)'), valor: Number(linha.valor ?? 0) })),
      conciliacao: null,
    };
  }
  const front = await consultarRecorteFront(pedido);
  const numeros = front.map((linha) => String(linha.numero_proposta ?? '').trim()).filter(Boolean);
  const funcao = await consultarSomentePropostasDaFuncao(numeros);
  return {
    pontos: agregarConciliado(front, funcao, (dimensao?.id as IdCampoRelatorio | undefined) ?? null, metrica.id as IdCampoRelatorio),
    conciliacao: resumirConciliacao(front, funcao),
  };
}

export async function executarPainelFixo(pedido: Pick<ConsultaVisao, 'empresa' | 'inicio' | 'fim'>): Promise<PainelFixo> {
  validarPeriodo(pedido.inicio, pedido.fim);
  const consultaBase: ConsultaVisao = { ...pedido, dimensao: null, metrica: 'qtd_propostas', grafico: 'indicador' };
  const front = await consultarRecorteFront(consultaBase);
  const numeros = front.map((linha) => String(linha.numero_proposta ?? '').trim()).filter(Boolean);
  const funcao = await consultarSomentePropostasDaFuncao(numeros);
  const indicador = (metrica: IdCampoRelatorio) => agregarConciliado(front, funcao, null, metrica)[0]?.valor ?? 0;
  return {
    conciliacao: resumirConciliacao(front, funcao),
    propostas: indicador('qtd_propostas'),
    valorContratado: indicador('valor_contratado'),
    valorLiberado: indicador('valor_liberado'),
    taxaIntegracao: indicador('taxa_integracao'),
    propostasPorHora: agregarConciliado(front, funcao, 'hora_cadastro', 'qtd_propostas'),
    funilFuncao: agregarConciliado(front, funcao, 'status_funcao', 'qtd_propostas'),
    rankingEquipes: agregarConciliado(front, funcao, 'equipe', 'valor_contratado'),
  };
}

export const formatoMetrica = (id: string): 'numero' | 'moeda' | 'percentual' => {
  campoRelatorio(id);
  if (id === 'qtd_propostas') return 'numero';
  if (id === 'taxa_integracao') return 'percentual';
  return 'moeda';
};
