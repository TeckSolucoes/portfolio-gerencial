import 'server-only';

import type { RowDataPacket } from 'mysql2/promise';
import { consultarFrontV2 } from '@/lib/bases/conexoes';
import { campoRelatorio, validarVisao, type IdCampoRelatorio, type TipoGrafico } from './catalogo';

interface LinhaBanco extends RowDataPacket {
  rotulo: string | null;
  valor: string | number | null;
}

export interface PontoVisao {
  rotulo: string;
  valor: number;
}

export interface ConsultaVisao {
  dimensao: IdCampoRelatorio | null;
  metrica: IdCampoRelatorio;
  grafico: TipoGrafico;
  inicio: string;
  fim: string;
  empresa: string;
}

const DIMENSOES: Record<string, string> = {
  hora_cadastro: "DATE_FORMAT(data_cadastro, '%Y-%m-%d %H:00')",
  dia_cadastro: 'DATE(data_cadastro)',
  gerente: "COALESCE(NULLIF(TRIM(Gerente), ''), '(não informado)')",
  equipe: "COALESCE(NULLIF(TRIM(Equipe), ''), '(não informado)')",
  operador: "COALESCE(NULLIF(TRIM(Operador), ''), '(não informado)')",
  convenio: "COALESCE(NULLIF(TRIM(convenio), ''), '(não informado)')",
  produto: "COALESCE(NULLIF(TRIM(produto), ''), '(não informado)')",
  modalidade: "COALESCE(NULLIF(TRIM(modalidade), ''), '(não informado)')",
  status_front: "COALESCE(NULLIF(TRIM(status_front), ''), '(não informado)')",
  status_funcao: "COALESCE(NULLIF(TRIM(Status_Funcao), ''), '(não informado)')",
  esteira_funcao: "COALESCE(NULLIF(TRIM(Esteira_Funcao), ''), '(não informado)')",
};

const numeroPtBr = (campo: string) => `CAST(REPLACE(REPLACE(COALESCE(${campo}, '0'), '.', ''), ',', '.') AS DECIMAL(20,2))`;

const METRICAS: Record<string, string> = {
  qtd_propostas: 'COUNT(DISTINCT id_front)',
  valor_contratado: `SUM(${numeroPtBr('valor_contrato')})`,
  valor_liberado: `SUM(${numeroPtBr('valor_liberacao')})`,
  ticket_medio: `SUM(${numeroPtBr('valor_contrato')}) / NULLIF(COUNT(DISTINCT id_front), 0)`,
  taxa_integracao: "100 * AVG(CASE WHEN UPPER(COALESCE(Status_Funcao, '')) = 'INTEGRADO' THEN 1 ELSE 0 END)",
};

export function validarPeriodo(inicio: string, fim: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim)) throw new Error('Período inválido.');
  const a = new Date(`${inicio}T00:00:00Z`);
  const b = new Date(`${fim}T00:00:00Z`);
  const dias = Math.floor((b.getTime() - a.getTime()) / 86_400_000);
  if (!Number.isFinite(dias) || dias < 0) throw new Error('A data final deve ser posterior à inicial.');
  if (dias > 91) throw new Error('Escolha um período de até 92 dias.');
}

export async function executarVisao(pedido: ConsultaVisao): Promise<PontoVisao[]> {
  validarPeriodo(pedido.inicio, pedido.fim);
  const { dimensao, metrica } = validarVisao(pedido.dimensao, pedido.metrica, pedido.grafico);
  const expressaoMetrica = METRICAS[metrica.id];
  if (!expressaoMetrica) throw new Error('Métrica ainda não disponível na fonte ao vivo.');
  const prefixoEquipe = pedido.empresa === 'AKRK' ? 'AKRK - %' : pedido.empresa === 'DIG' ? 'DIG - %' : '__sem_acesso__';

  if (!dimensao) {
    const linhas = await consultarFrontV2<LinhaBanco[]>(
      `SELECT 'Total' AS rotulo, ${expressaoMetrica} AS valor
       FROM \`db-atendimento\`.v_andamento_propostas
       WHERE data_cadastro >= ? AND data_cadastro < DATE_ADD(?, INTERVAL 1 DAY)
         AND Equipe LIKE ?`,
      [pedido.inicio, pedido.fim, prefixoEquipe],
    );
    return [{ rotulo: 'Total', valor: Number(linhas[0]?.valor ?? 0) }];
  }

  const expressaoDimensao = DIMENSOES[dimensao.id];
  if (!expressaoDimensao) throw new Error('Dimensão ainda não disponível na fonte ao vivo.');
  const ordem = dimensao.tipo === 'tempo' ? 'rotulo ASC' : 'valor DESC, rotulo ASC';
  const linhas = await consultarFrontV2<LinhaBanco[]>(
    `SELECT ${expressaoDimensao} AS rotulo, ${expressaoMetrica} AS valor
     FROM \`db-atendimento\`.v_andamento_propostas
     WHERE data_cadastro >= ? AND data_cadastro < DATE_ADD(?, INTERVAL 1 DAY)
       AND Equipe LIKE ?
     GROUP BY ${expressaoDimensao}
     ORDER BY ${ordem}
     LIMIT 50`,
    [pedido.inicio, pedido.fim, prefixoEquipe],
  );
  return linhas.map((linha) => ({ rotulo: String(linha.rotulo ?? '(não informado)'), valor: Number(linha.valor ?? 0) }));
}

export const formatoMetrica = (id: string): 'numero' | 'moeda' | 'percentual' => {
  campoRelatorio(id);
  if (id === 'qtd_propostas') return 'numero';
  if (id === 'taxa_integracao') return 'percentual';
  return 'moeda';
};
