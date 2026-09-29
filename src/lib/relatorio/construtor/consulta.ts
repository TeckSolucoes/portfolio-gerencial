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
  conciliacao: ResumoConciliacao;
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
       id_front,
       NULLIF(TRIM(cod_funcao), '') AS numero_proposta,
       DATE_FORMAT(data_cadastro, '%Y-%m-%d %H:00') AS hora_cadastro,
       DATE_FORMAT(data_cadastro, '%Y-%m-%d') AS dia_cadastro,
       COALESCE(NULLIF(TRIM(Gerente), ''), '(não informado)') AS gerente,
       COALESCE(NULLIF(TRIM(Equipe), ''), '(não informado)') AS equipe,
       COALESCE(NULLIF(TRIM(Operador), ''), '(não informado)') AS operador,
       COALESCE(NULLIF(TRIM(convenio), ''), '(não informado)') AS convenio,
       COALESCE(NULLIF(TRIM(produto), ''), '(não informado)') AS produto,
       COALESCE(NULLIF(TRIM(modalidade), ''), '(não informado)') AS modalidade,
       COALESCE(NULLIF(TRIM(status_front), ''), '(não informado)') AS status_front,
       NULLIF(TRIM(Status_Funcao), '') AS status_funcao_v2,
       NULLIF(TRIM(Esteira_Funcao), '') AS esteira_funcao_v2,
       valor_contrato
     FROM \`db-atendimento\`.v_andamento_propostas
     WHERE data_cadastro >= ? AND data_cadastro < DATE_ADD(?, INTERVAL 1 DAY)
       AND Equipe LIKE ?
     LIMIT ${LIMITE_PROPOSTAS_FRONT + 1}`,
    [pedido.inicio, pedido.fim, prefixoEquipe],
  );
  if (linhas.length > LIMITE_PROPOSTAS_FRONT) throw new Error('O período retornou mais de 100 mil propostas. Reduza o intervalo.');
  return linhas;
}

async function consultarSomentePropostasDaFuncao(numeros: string[]): Promise<LinhaFuncao[]> {
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
