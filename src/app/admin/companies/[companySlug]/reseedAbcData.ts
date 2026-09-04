import type { FrontStatus, ItemStatus } from '@/generated/prisma/enums';

// Dados + regras de derivação puros (sem 'use server', sem I/O) — separado da
// action pra dar pra testar a lógica de agrupamento/derivação sem precisar de
// sessão HTTP real. Conteúdo migrado do arquivo Entregas.md do usuário
// (2026-09-02): agrupamento por prefixo do item (Máscara/Função/Único/...) é
// a única categorização inferível dos dados de origem — sem dono, próximo
// marco ou priorização no arquivo, então esses campos ficam como placeholder
// pra curadoria preencher depois.

export interface ItemSeed {
  title: string;
  status: ItemStatus;
  note?: string;
}

export interface FrontSeed {
  slug: string;
  title: string;
  summary: string;
  items: ItemSeed[];
}

export const ABC_ENTREGAS_FRONTS: FrontSeed[] = [
  {
    slug: 'mascara',
    title: 'Máscara',
    summary:
      'Ajustes e novas funcionalidades no sistema de Máscara: otimizações de performance, telas de compra de dívida, consignatária na cessão de crédito e liberações de RH, INSS e consulta de margem em homologação.',
    items: [
      { title: 'Otimização dos MicroApps', status: 'done', note: 'Correção de lentidão reportada por usuários.' },
      {
        title: 'Ocultação do link no campo de observação',
        status: 'done',
        note: 'Visualização passa a ficar no campo de formalização.',
      },
      {
        title: 'Extensão e Gestão de Compra de Dívida',
        status: 'done',
        note: 'Data do primeiro vencimento para operações de compra de dívida.',
      },
      { title: 'Ajustes no relatório de promotora e operacional', status: 'done', note: 'Abrange Capital e ABC.' },
      { title: 'Implementação da Consignatária na Cessão de Crédito', status: 'done' },
      { title: 'Implementação de Consulta de Margem (Belo Horizonte)', status: 'done' },
      { title: 'Liberação e aprovação pelo RH no cadastro de usuários', status: 'doing' },
      { title: 'INSS — cadastro de proposta, ajuste de máscaras', status: 'doing', note: 'Ajuste de limite.' },
      {
        title: 'Consulta de margem e averbação nas esteiras',
        status: 'doing',
        note:
          'Homologação pelo time de Produtos — convênios já cadastrados: Siape, Prefeitura de São Paulo e Governo de São Paulo.',
      },
    ],
  },
  {
    slug: 'funcao',
    title: 'Função',
    summary:
      'Módulo de Função: máscara de edição já entregue; API de CallBack, armazenamento de dados da ABC e rotinas de consulta nas esteiras seguem em desenvolvimento e homologação.',
    items: [
      { title: 'Implementação da Máscara de Edição', status: 'done' },
      {
        title: 'CallBack — serviço de API',
        status: 'doing',
        note:
          'Substitui o serviço do David; homologação pela Teck do serviço que ouve alterações de esteiras para movimentar propostas automaticamente.',
      },
      {
        title: 'Armazenamento — tabelas e estrutura para ABC',
        status: 'doing',
        note: 'Em desenvolvimento pelo time de DevOps & Automação.',
      },
      { title: 'Rotinas de consulta nas esteiras', status: 'doing' },
    ],
  },
  {
    slug: 'unico',
    title: 'Único',
    summary: 'Credenciais de acesso ao sistema Único — produção já liberada, homologação pendente.',
    items: [
      { title: 'Credenciais de produção', status: 'done' },
      { title: 'Credenciais de homologação', status: 'blocked', note: 'Pendente pelo time de Produtos.' },
    ],
  },
  {
    slug: 'portal-abc',
    title: 'Portal ABC',
    summary: 'Entrega do KITDOC no Portal ABC.',
    items: [{ title: 'KITDOC', status: 'done' }],
  },
  {
    slug: 'frontconsig',
    title: 'FrontConsig',
    summary:
      'Cadastro e gerenciamento de convênios (V1) entregue; V2 será construído como serviço multi-tenant, unificando suporte e manutenção entre empresas.',
    items: [
      { title: 'Cadastro e gerenciamento de convênios (V1)', status: 'done' },
      {
        title: 'FrontConsig V2',
        status: 'doing',
        note: 'Construído como serviço com suporte a múltiplas empresas (tenants), facilitando suporte e manutenção.',
      },
    ],
  },
  {
    slug: 'portal-unico-interno',
    title: 'Portal Único (Interno)',
    summary: 'Disponibilização do Portal Único para uso interno.',
    items: [{ title: 'Disponibilização do portal', status: 'done' }],
  },
  {
    slug: 'regulatorio',
    title: 'Regulatório',
    summary:
      'Adesões regulatórias em andamento (Siloc, PCR) aguardando aprovação de custos de infraestrutura junto à RTM/Nuclea; Fundo de Passagem e envio de CET aguardam definição do time de Produtos.',
    items: [
      {
        title: 'Adesão ao Siloc',
        status: 'doing',
        note:
          'Projeto aberto com a RTM, cadastro técnico já enviado à Nuclea — aguardando aprovação de custos de máquinas virtuais e conexões com a RTM.',
      },
      {
        title: 'Adesão ao PCR',
        status: 'doing',
        note:
          'Projeto aberto com a RTM, cadastro técnico já enviado à Nuclea — aguardando aprovação de custos de máquinas virtuais e conexões com a RTM.',
      },
      { title: 'Fundo de Passagem', status: 'blocked', note: 'Aguardando definição do time de Produtos.' },
      { title: 'Envio da CET', status: 'blocked', note: 'Aguardando definição do time de Produtos.' },
    ],
  },
  {
    slug: 'merito',
    title: 'Mérito',
    summary: 'Testes nos endpoints e campos retornáveis do Mérito.',
    items: [
      {
        title: 'Testes nos endpoints e campos retornáveis',
        status: 'doing',
        note: 'Falta definição do time de Produtos.',
      },
    ],
  },
];

export function deriveFrontStatus(items: ItemSeed[]): FrontStatus {
  if (items.some((i) => i.status === 'blocked')) return 'blocked';
  if (items.some((i) => i.status !== 'done')) return 'attention';
  return 'ok';
}

export function deriveProgress(items: ItemSeed[]): number {
  const done = items.filter((i) => i.status === 'done').length;
  return Math.round((done / items.length) * 100);
}
