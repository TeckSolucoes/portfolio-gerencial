import 'server-only';

import type { RowDataPacket } from 'mysql2/promise';
import { consultarFrontV2, consultarFuncaoEmLotes } from '@/lib/bases/conexoes';
import { criarCache } from '@/lib/cache/memoria';
import type { Empresa } from '@/lib/empresas';
import { gravarCache, lerCache } from '@/lib/workers/cache';
import { normalizarProduto } from './casos';
import { escopoGerente, montarRelatorio } from './relatorio';
import { mesclarPropostas, type SnapshotPropostas } from './snapshot';
import type { Proposta, Relatorio } from './types';

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

interface LinhaFuncao extends RowDataPacket {
  NumeroProposta: string;
  status_funcao_raw: string | null;
  status_funcao: string | null;
  esteira_funcao: string | null;
  valor_liberado: string | number | null;
  data_integracao: string | null;
}

interface LinhaTotaisGerais extends RowDataPacket {
  qtd: string | number;
  valor: string | number | null;
  cancelados_qtd: string | number;
  cancelados_valor: string | number | null;
}

const LIMITE = 50_000;
const TAMANHO_LOTE_FUNCAO = 800;
const semAcento = (valor: unknown) => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
const numeroPtBr = (valor: string | number | null | undefined) => {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
  const texto = String(valor ?? '').trim().replace(/^R\$\s*/, '');
  if (!texto) return 0;
  const numero = Number(texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto);
  return Number.isFinite(numero) ? numero : 0;
};
const inicioDaJanela = (ref: string) => {
  const data = new Date(`${ref}T00:00:00Z`);
  data.setUTCDate(data.getUTCDate() - 31);
  return data.toISOString().slice(0, 10);
};

// A consulta ao Front V2 + Função é cara (rede, dezenas de lotes na Função) e o resultado não muda
// pela aba (Geral/gerente): guardamos as propostas por (empresa, dia) e cada aba só filtra em
// memória (montarRelatorio, barato). Container de vida longa, então isso vale entre requisições e
// entre usuários diferentes olhando o mesmo dia — sem isso, cada clique de aba repetia tudo.
const TTL_DIA_FECHADO_MS = 60 * 60 * 1000; // dia encerrado não deveria mudar; ainda assim atualiza de hora em hora
const TTL_HOJE_MS = 3 * 60 * 1000; // dia corrente ainda em formação: reconsulta com mais frequência
const cachePropostas = criarCache<Proposta[]>();
const cacheTotaisGerais = criarCache<{ vendas: { qtd: number; valor: number }; cancelados: { qtd: number; valor: number } }>();

const hojeSp = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

async function consultarPropostasDaFuncao(numeros: string[]): Promise<LinhaFuncao[]> {
  const unicos = [...new Set(numeros.map((numero) => numero.trim()).filter(Boolean))];
  const consultas = [];
  for (let i = 0; i < unicos.length; i += TAMANHO_LOTE_FUNCAO) {
    const lote = unicos.slice(i, i + TAMANHO_LOTE_FUNCAO);
    const marcadores = lote.map(() => '?').join(', ');
    consultas.push({
      sql: `WITH liberacoes AS (
              SELECT NumeroProposta, SUM(Valor) AS valor_liberado, DATE(MIN(created_at)) AS data_integracao
              FROM releases
              WHERE deleted_at IS NULL AND NumeroProposta IN (${marcadores})
              GROUP BY NumeroProposta
            )
            SELECT p.NumeroProposta,
              p.SituacaoPropostaEsteira AS status_funcao_raw,
              f.SituacaoEsteira AS status_funcao,
              COALESCE(NULLIF(f.last_activity_description, ''), NULLIF(f.Descricao, ''), f.SituacaoEsteira) AS esteira_funcao,
              COALESCE(l.valor_liberado, 0) AS valor_liberado,
              COALESCE(l.data_integracao, CASE WHEN p.SituacaoPropostaEsteira = 'INT' THEN DATE(p.updated_at) END) AS data_integracao
            FROM proposals p
            LEFT JOIN function_mat_information f
              ON f.NumeroProposta = p.NumeroProposta AND f.deleted_at IS NULL
            LEFT JOIN liberacoes l ON l.NumeroProposta = p.NumeroProposta
            WHERE p.deleted_at IS NULL AND p.NumeroProposta IN (${marcadores})`,
      parametros: [...lote, ...lote],
    });
  }
  return consultas.length ? consultarFuncaoEmLotes<LinhaFuncao>(consultas) : [];
}

async function buscarPropostasAoVivo(empresa: Empresa, ref: string, inicio = inicioDaJanela(ref)): Promise<Proposta[]> {
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
    [inicio, ref, prefixoEquipe],
  );
  if (linhas.length > LIMITE) throw new Error('O recorte ultrapassou 50 mil propostas. Reduza a janela do relatório.');

  const numeros = [...new Set(linhas.map((linha) => String(linha.numero ?? '').trim()).filter(Boolean))];
  const funcao = await consultarPropostasDaFuncao(numeros);
  const porNumero = new Map(funcao.map((linha) => [String(linha.NumeroProposta ?? '').trim(), linha]));
  const propostas: Proposta[] = [];

  for (const linha of linhas) {
    const produto = normalizarProduto(String(linha.produto ?? ''));
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
      dataIntegracao: atual?.data_integracao ? String(atual.data_integracao).slice(0, 10) : undefined,
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

  return propostas;
}

const idSnapshot = (empresa: Empresa) => `relatorio-propostas-v2-${empresa.toLowerCase()}`;

async function consultarTotaisGerais(empresa: Empresa, escopo: string) {
  const prefixoEquipe = empresa === 'AKRK' ? 'AKRK - %' : empresa === 'DIG' ? 'DIG - %' : '__sem_acesso__';
  const gerente = escopo === 'Geral' ? null : `${escopo.trim().split(/\s+/)[0]}%`;
  const linhas = await consultarFrontV2<LinhaTotaisGerais[]>(
    `SELECT COUNT(*) AS qtd,
       COALESCE(SUM(base.valor), 0) AS valor,
       COALESCE(SUM(base.cancelada), 0) AS cancelados_qtd,
       COALESCE(SUM(CASE WHEN base.cancelada = 1 THEN base.valor ELSE 0 END), 0) AS cancelados_valor
     FROM (
       SELECT ap.id,
         MAX(COALESCE(ap.valorTotalContratado, 0) / 100) AS valor,
         MAX(CASE WHEN UPPER(COALESCE(ap.status, '')) LIKE '%CANCEL%'
                    OR UPPER(COALESCE(ap.fStatus, '')) LIKE '%CANCEL%'
                  THEN 1 ELSE 0 END) AS cancelada
       FROM \`db-atendimento\`.v_tab_atendimento t
       JOIN \`db-atendimento\`.atendimento_propostas ap ON ap.id = t.id_front
       WHERE t.Equipe LIKE ? AND ap.deleted_at IS NULL
         AND (? IS NULL OR t.Gerente LIKE ?)
       GROUP BY ap.id
     ) base`,
    [prefixoEquipe, gerente, gerente],
  );
  const linha = linhas[0];
  return {
    vendas: { qtd: Number(linha?.qtd ?? 0), valor: numeroPtBr(linha?.valor) },
    cancelados: { qtd: Number(linha?.cancelados_qtd ?? 0), valor: numeroPtBr(linha?.cancelados_valor) },
  };
}

async function buscarPropostasIncrementais(empresa: Empresa, ref: string): Promise<Proposta[]> {
  // Para datas históricas, mantém a leitura fechada da janela solicitada. O snapshot
  // persistente é exclusivo do dia corrente e sobrevive a deploys no volume do EasyPanel.
  if (ref !== hojeSp()) return buscarPropostasAoVivo(empresa, ref);

  const id = idSnapshot(empresa);
  const salvo = await lerCache<SnapshotPropostas>(id);
  if (!salvo || salvo.dados.ref !== ref) {
    const propostas = await buscarPropostasAoVivo(empresa, ref);
    await gravarCache(id, { ref, propostas } satisfies SnapshotPropostas);
    return propostas;
  }

  // Durante o dia, o Front e o Função recebem somente as propostas de hoje. Elas são
  // inseridas ou substituídas no snapshot; a consolidação completa volta a ocorrer no
  // primeiro acesso do dia seguinte.
  const recentes = await buscarPropostasAoVivo(empresa, ref, ref);
  const propostas = mesclarPropostas(salvo.dados.propostas, recentes);
  await gravarCache(id, { ref, propostas } satisfies SnapshotPropostas);
  return propostas;
}

export async function carregarRelatorioAoVivo(empresa: Empresa, ref: string, escopo: string): Promise<Relatorio> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ref)) throw new Error('Data inválida.');
  const ttl = ref === hojeSp() ? TTL_HOJE_MS : TTL_DIA_FECHADO_MS;
  const [propostas, totaisGerais] = await Promise.all([
    cachePropostas.obter(`${empresa}:${ref}`, ttl, () => buscarPropostasIncrementais(empresa, ref)),
    cacheTotaisGerais.obter(`${empresa}:${escopo}`, TTL_DIA_FECHADO_MS, () => consultarTotaisGerais(empresa, escopo)),
  ]);
  const relatorio = montarRelatorio(propostas, ref, escopo === 'Geral' ? null : escopoGerente(escopo));
  relatorio.kpis.vendasGeral = totaisGerais.vendas;
  relatorio.kpis.canceladosGeral = totaisGerais.cancelados;
  return relatorio;
}
