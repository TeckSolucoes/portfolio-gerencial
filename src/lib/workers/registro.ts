import 'server-only';
import { atosDoDiarioOficial } from '../diarioOficial';
import { FONTES } from '../diarios';
import { ibovespa, indicadores, noticias } from '../mercado';
import { atualizarMapeamento } from '../transparencia/mapeamento';
import type { Worker } from './tipos';

// Fonte que respondeu vazio = coleta ok com 0 itens; fonte que não respondeu (null) = erro.
const naoNulo = <T,>(v: T | null, fonte: string): T => {
  if (v === null) throw new Error(`${fonte} não respondeu.`);
  return v;
};

export const TOPICOS_NOTICIAS = [
  { id: 'mercado', nome: 'Mercado financeiro', consulta: 'mercado financeiro' },
  { id: 'bancos', nome: 'Bancos', consulta: 'bancos' },
  { id: 'investimentos', nome: 'Investimentos', consulta: 'investimentos' },
  { id: 'consignado', nome: 'Crédito consignado', consulta: 'crédito consignado' },
] as const;

const noticiasWorkers: Worker[] = TOPICOS_NOTICIAS.map((t) => ({
  id: `noticias-${t.id}`,
  nome: `Notícias · ${t.nome}`,
  grupo: 'Notícias',
  descricao: `Manchetes de "${t.consulta}" (Google Notícias, RSS público).`,
  executar: async () => {
    const lista = naoNulo(await noticias(t.consulta), 'Google Notícias');
    return { itens: lista.length, mensagem: `${lista.length} manchetes`, dados: lista };
  },
}));

const mercadoWorkers: Worker[] = [
  {
    id: 'mercado-bolsa',
    nome: 'Bolsa · Ibovespa',
    grupo: 'Mercado',
    descricao: 'Cotação do Ibovespa (Yahoo Finance, endpoint público não oficial).',
    executar: async () => {
      const c = naoNulo(await ibovespa(), 'Yahoo Finance');
      return { itens: 1, mensagem: `${Math.round(c.pontos).toLocaleString('pt-BR')} pts`, dados: c };
    },
  },
  {
    id: 'mercado-bcb',
    nome: 'Indicadores · Banco Central',
    grupo: 'Mercado',
    descricao: 'Selic (meta), CDI e IPCA pela API do SGS do Banco Central.',
    executar: async () => {
      const lista = await indicadores();
      if (lista.length === 0) throw new Error('Banco Central não respondeu.');
      return { itens: lista.length, mensagem: `${lista.length} indicadores`, dados: lista };
    },
  },
];

// Período 'ano' é o mais largo; as telas recortam semana/mês a partir dele.
const PERIODO_COLETA = 'ano' as const;

const diarioWorkers: Worker[] = [
  {
    id: 'diario-dou',
    nome: 'Diário Oficial · União (DOU)',
    grupo: 'Diário Oficial',
    descricao: 'Atos federais sobre consignado (INSS, SIAPE/Gestão, CNPS, Banco Central) na Imprensa Nacional.',
    executar: async () => {
      const atos = naoNulo(await atosDoDiarioOficial(PERIODO_COLETA), 'Imprensa Nacional');
      return { itens: atos.length, mensagem: `${atos.length} atos no ano`, dados: atos };
    },
  },
  ...FONTES.map(
    (f): Worker => ({
      id: `diario-${f.id}`,
      nome: `Diário Oficial · ${f.nome.replace(/^Diário Oficial (d[aeo]s? )?/i, '')}`,
      grupo: 'Diário Oficial',
      descricao: `Atos sobre consignado que afetam: ${f.convenios.join(', ')}.`,
      executar: async () => {
        const atos = naoNulo(await f.buscar(PERIODO_COLETA), f.nome);
        return { itens: atos.length, mensagem: `${atos.length} atos no ano`, dados: atos };
      },
    }),
  ),
];

const transparenciaWorkers: Worker[] = [
  {
    id: 'transparencia-servidores',
    nome: 'Transparência · Servidores federais (mapeamento mensal)',
    grupo: 'Transparência',
    descricao:
      'Baixa o arquivo mensal oficial de servidores SIAPE do Portal da Transparência, compara com o mês anterior e monta a lista de novos que ainda não são clientes. Só roda de fato quando o Portal publica um mês novo.',
    limiteMs: 60 * 60_000, // arquivo de centenas de MB: download e leitura levam minutos
    executar: async () => {
      const rs = await atualizarMapeamento();
      if (rs.length === 0) return { itens: 0, mensagem: 'Nenhum mês novo publicado pelo Portal.', dados: rs };
      const partes = rs.map((r) =>
        r.situacao === 'indisponivel'
          ? `${r.mes}: ainda não publicado`
          : r.situacao === 'base'
            ? `${r.mes}: base registrada (${r.servidores.toLocaleString('pt-BR')} servidores)`
            : `${r.mes}: ${r.acionaveis.toLocaleString('pt-BR')} acionáveis de ${r.entraram.toLocaleString('pt-BR')} novos`,
      );
      const itens = rs.reduce((t, r) => t + (r.situacao === 'processado' ? r.acionaveis : 0), 0);
      return { itens, mensagem: partes.join(' · '), dados: rs };
    },
  },
];

export const WORKERS: Worker[] = [...noticiasWorkers, ...mercadoWorkers, ...diarioWorkers, ...transparenciaWorkers];

export const workerPorId = (id: string) => WORKERS.find((w) => w.id === id);
