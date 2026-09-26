import 'server-only';
import { atosDoDiarioOficial } from '../diarioOficial';
import { FONTES } from '../diarios';
import { ibovespa, indicadores, noticias } from '../mercado';
import { chaveConfigurada, coletarAgregadoFederal } from '../transparencia/federal';
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
  intervaloMin: 30,
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
    intervaloMin: 15,
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
    intervaloMin: 60,
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
    intervaloMin: 60,
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
      intervaloMin: 60,
      executar: async () => {
        const atos = naoNulo(await f.buscar(PERIODO_COLETA), f.nome);
        return { itens: atos.length, mensagem: `${atos.length} atos no ano`, dados: atos };
      },
    }),
  ),
];

const transparenciaWorkers: Worker[] = [
  {
    id: 'transparencia-federal',
    nome: 'Transparência · Servidores federais (por órgão)',
    grupo: 'Transparência',
    descricao: 'Contagem agregada de servidores por órgão (Portal da Transparência federal). Só números, sem nome nem CPF.',
    intervaloMin: 24 * 60,
    pendencia: () => (chaveConfigurada() ? null : 'Falta a chave da API (variável PORTAL_TRANSPARENCIA_CHAVE no EasyPanel).'),
    executar: async () => {
      const agregado = await coletarAgregadoFederal();
      return { itens: agregado.linhas, mensagem: `${agregado.totalPessoas.toLocaleString('pt-BR')} pessoas em ${agregado.porOrgao.length} órgãos`, dados: agregado };
    },
  },
];

export const WORKERS: Worker[] = [...noticiasWorkers, ...mercadoWorkers, ...diarioWorkers, ...transparenciaWorkers];

export const workerPorId = (id: string) => WORKERS.find((w) => w.id === id);
