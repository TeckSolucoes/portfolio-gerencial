import 'server-only';

import type { RowDataPacket } from 'mysql2/promise';
import { consultarFrontV2 } from '@/lib/bases/conexoes';
import type { Empresa } from '@/lib/empresas';
import { normalizarProduto } from './casos';
import { escopoGerente, montarRelatorio } from './relatorio';
import type { Proposta, Relatorio } from './types';
import { consultarSomentePropostasDaFuncao } from './construtor/consulta';
import { numeroPtBr } from './construtor/conciliacao';

interface LinhaDiaria extends RowDataPacket {
  id_front: string | number;
  numero: string | null;
  cpf: string | null;
  nome: string | null;
  produto: string | null;
  modalidade: string | null;
  data: string;
  hora: string;
  valor: string | number | null;
  gerente: string | null;
  equipe: string | null;
  operador: string | null;
  convenio: string | null;
  status_front: string | null;
  esteira_v2: string | null;
  status_funcao_v2: string | null;
  motivo_funcao: string | null;
  excecao: string | number | boolean | null;
  data_cancelamento: string | null;
}

const LIMITE = 50_000;
const semAcento = (valor: unknown) => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
const inicioDaJanela = (ref: string) => {
  const data = new Date(`${ref}T00:00:00Z`);
  data.setUTCDate(data.getUTCDate() - 91);
  return data.toISOString().slice(0, 10);
};

export async function carregarRelatorioAoVivo(empresa: Empresa, ref: string, escopo: string): Promise<Relatorio> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ref)) throw new Error('Data inválida.');
  const prefixoEquipe = empresa === 'AKRK' ? 'AKRK - %' : empresa === 'DIG' ? 'DIG - %' : '__sem_acesso__';
  const linhas = await consultarFrontV2<LinhaDiaria[]>(
    `SELECT
       ap.id AS id_front,
       NULLIF(TRIM(ap.codigoPropostaExterna), '') AS numero,
       t.cpf_cliente AS cpf,
       t.nome_cliente AS nome,
       pd.descricao AS produto,
       md.nome AS modalidade,
       DATE_FORMAT(ap.created_at, '%Y-%m-%d') AS data,
       DATE_FORMAT(ap.created_at, '%H:%i:%s') AS hora,
       COALESCE(ap.valorTotalContratado, 0) / 100 AS valor,
       t.Gerente AS gerente,
       t.Equipe AS equipe,
       t.Operador AS operador,
       cf.nome_convenio AS convenio,
       ap.status AS status_front,
       ap.fEsteira AS esteira_v2,
       ap.fStatus AS status_funcao_v2,
       ap.motivoCancelamentoFuncao AS motivo_funcao,
       ap.excecao,
       DATE_FORMAT(ap.dataUltimaAtualizacaoFuncao, '%Y-%m-%d') AS data_cancelamento
     FROM \`db-atendimento\`.v_tab_atendimento t
     JOIN \`db-atendimento\`.atendimento_propostas ap ON ap.id = t.id_front
     LEFT JOIN \`db-empresa\`.v_convenio_formatado cf ON cf.id_convenio = ap.convenio
     LEFT JOIN \`db-empresa\`.produtos pd ON pd.id = ap.tipoOperacao
     LEFT JOIN \`db-tabela\`.tabela_simulacao ts ON ts.id = ap.tabela
     LEFT JOIN \`db-tabela\`.tabela_simulacao_modalidade md ON md.id = ts.idModalidade
     WHERE ap.created_at >= ? AND ap.created_at < DATE_ADD(?, INTERVAL 1 DAY)
       AND t.Equipe LIKE ? AND ap.deleted_at IS NULL
     GROUP BY ap.id
     LIMIT ${LIMITE + 1}`,
    [inicioDaJanela(ref), ref, prefixoEquipe],
  );
  if (linhas.length > LIMITE) throw new Error('O recorte ultrapassou 50 mil propostas. Reduza a janela do relatório.');

  const numeros = [...new Set(linhas.map((linha) => String(linha.numero ?? '').trim()).filter(Boolean))];
  const funcao = await consultarSomentePropostasDaFuncao(numeros);
  const porNumero = new Map(funcao.map((linha) => [String(linha.NumeroProposta ?? '').trim(), linha]));
  const propostas: Proposta[] = [];

  for (const linha of linhas) {
    const produto = normalizarProduto(String(linha.produto ?? ''));
    if (!produto) continue;
    const numero = String(linha.numero ?? '').trim();
    const atual = porNumero.get(numero);
    const statusFuncao = semAcento(atual?.status_funcao ?? linha.status_funcao_v2);
    const statusRaw = semAcento(atual?.status_funcao_raw);
    const statusFront = String(linha.status_front ?? '').trim();
    const statusFrontNormal = semAcento(statusFront);
    const esteira = String(atual?.esteira_funcao ?? linha.esteira_v2 ?? '').trim();
    const esteiraNormal = semAcento(esteira);
    const cancelada = statusRaw === 'CAN' || statusFuncao.includes('CANCEL') || statusFrontNormal.includes('CANCEL');
    propostas.push({
      numero: numero || String(linha.id_front),
      cpf: String(linha.cpf ?? ''),
      nome: String(linha.nome ?? ''),
      produto,
      modalidade: String(linha.modalidade ?? ''),
      data: linha.data,
      hora: linha.hora,
      valor: numeroPtBr(linha.valor),
      gerente: String(linha.gerente ?? '(não informado)'),
      equipe: String(linha.equipe ?? '(não informado)'),
      operador: String(linha.operador ?? '(não informado)'),
      convenio: String(linha.convenio ?? '(não informado)'),
      status: statusFront || '(não informado)',
      esteira,
      temCodigoFuncao: Boolean(numero),
      integrada: statusRaw === 'INT' || statusFuncao.includes('INTEGRAD') || statusFrontNormal.includes('INTEGRAD'),
      excecao: ['1', 'TRUE', 'SIM'].includes(semAcento(linha.excecao)),
      cancelada,
      frontReprovado: statusFrontNormal.includes('REPROV'),
      esteiraReprovada: statusRaw === 'REP' || statusFuncao.includes('REPROV') || esteiraNormal.includes('REPROV'),
      motivoCancFront: String(linha.motivo_funcao ?? ''),
      motivoCancelamento: String(linha.motivo_funcao ?? ''),
      dataCancelamento: cancelada ? String(linha.data_cancelamento ?? '') : '',
    });
  }

  return montarRelatorio(propostas, ref, escopo === 'Geral' ? null : escopoGerente(escopo));
}
