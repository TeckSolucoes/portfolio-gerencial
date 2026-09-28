import 'server-only';
import { atosDoDiarioOficial } from '../diarioOficial';
import { FONTES } from '../diarios';
import { ibovespa, indicadores, noticias } from '../mercado';
import { atualizarMapeamento } from '../transparencia/mapeamento';
import { coletarCadastros, coletarMencoes, coletarSancoes } from '../juridico';
import { normalizarChavePortal } from '../portalTransparencia';
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

// Cada rotina lê os CNPJs ativos cadastrados em /juridico. Nenhum CNPJ fica fixo no código.
// São workers independentes para permitir ligar, desligar e agendar cada fonte em tela.
const juridicoWorkers: Worker[] = [
  {
    id: 'juridico-cadastro',
    nome: 'Jurídico · Cadastro dos CNPJs',
    grupo: 'Jurídico',
    descricao: 'Atualiza razão social, nome fantasia, situação e atividade cadastral via BrasilAPI/Minha Receita.',
    executar: async () => {
      const itens = await coletarCadastros();
      return { itens, mensagem: `${itens} cadastros atualizados`, dados: { itens } };
    },
  },
  {
    id: 'juridico-internet',
    nome: 'Jurídico · Menções na internet',
    grupo: 'Jurídico',
    descricao: 'Modelo Google Alerts: busca menções pela razão social, nome fantasia e CNPJ com e sem máscara.',
    executar: async () => {
      const itens = await coletarMencoes('internet');
      return { itens, mensagem: `${itens} novas menções`, dados: { itens } };
    },
  },
  {
    id: 'juridico-processos',
    nome: 'Jurídico · Processos e tribunais',
    grupo: 'Jurídico',
    descricao: 'Busca menções públicas envolvendo processos, tribunais e ações judiciais. Consulta processual completa exigirá conector próprio.',
    executar: async () => {
      const itens = await coletarMencoes('processos');
      return { itens, mensagem: `${itens} novas menções processuais`, dados: { itens } };
    },
  },
  {
    id: 'juridico-licitacoes',
    nome: 'Jurídico · Licitações e contratos',
    grupo: 'Jurídico',
    descricao: 'Busca menções públicas sobre licitações, pregões, contratos e PNCP pelo nome cadastrado.',
    executar: async () => {
      const itens = await coletarMencoes('licitacoes');
      return { itens, mensagem: `${itens} novas menções de licitações`, dados: { itens } };
    },
  },
  {
    id: 'juridico-sancoes',
    nome: 'Jurídico · Sanções CEIS/CNEP',
    grupo: 'Jurídico',
    descricao: 'Consulta CEIS e CNEP por CNPJ: 2 chamadas por empresa. Proteção interna de 120 chamadas/minuto, abaixo dos limites oficiais de 400/min durante o dia e 700/min entre 00h e 06h. Observação: a chave atual está vinculada ao responsável e ao e-mail pflendesjr@hotmail.com; substituir por uma credencial institucional.',
    limiteMs: 30 * 60_000,
    pendencia: () => normalizarChavePortal(process.env.PORTAL_TRANSPARENCIA_API_KEY) ? null : 'Falta PORTAL_TRANSPARENCIA_API_KEY no EasyPanel.',
    executar: async () => {
      const itens = await coletarSancoes();
      return { itens, mensagem: `${itens} novas sanções`, dados: { itens } };
    },
  },
];

export const WORKERS: Worker[] = [...noticiasWorkers, ...mercadoWorkers, ...diarioWorkers, ...transparenciaWorkers, ...juridicoWorkers];

export const workerPorId = (id: string) => WORKERS.find((w) => w.id === id);
