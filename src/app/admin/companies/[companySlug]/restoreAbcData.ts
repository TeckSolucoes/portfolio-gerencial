import type { FrontStatus } from '@/generated/prisma/enums';

// Reconstrução manual das frentes da ABC Card a partir do texto do link
// externo que o usuário colou (2026-09) — o banco de produção perdeu os
// dados por falta de volume persistente no EasyPanel (corrigido). Só dá pra
// reconstruir o que a tela pública mostrava: título, status, priorização,
// responsável, próximo marco/data e progresso. A CONTAGEM de itens aparecia
// ali, mas o CONTEÚDO de cada item (título/status/nota) não — por isso as
// frentes abaixo nascem sem itens, com progresso em modo manual preservando
// o valor exato que existia. Curadoria precisa recriar os itens à mão depois.
export interface RestoredFront {
  slug: string;
  title: string;
  status: FrontStatus;
  prioritized: boolean;
  ownerInitials: string;
  ownerName: string;
  nextMilestone: string | null;
  nextDate: string | null; // "DD/MM", ano 2026
  progress: number;
  itemCount: number; // só pra registro/conferência — não vira FrontItem de verdade
}

export const ABC_RESTORED_FRONTS: RestoredFront[] = [
  { slug: 'lancamento-app-apus', title: 'Lançamento do Aplicativo - APUS', status: 'ok', prioritized: true, ownerInitials: 'IN', ownerName: 'Teck Soluções', nextMilestone: 'Lançamento oficial', nextDate: null, progress: 60, itemCount: 3 },
  { slug: 'mascara-otimizacao-microapps', title: 'MÁSCARA | Otimização dos MicroApps - correção de lentidão reportada por usuários', status: 'ok', prioritized: true, ownerInitials: 'MC', ownerName: 'Teck Soluções', nextMilestone: null, nextDate: null, progress: 100, itemCount: 0 },
  { slug: 'mascara-ocultacao-link-observacao', title: 'MÁSCARA | Ocultação do link no campo de observação com visualização no campo formalização', status: 'ok', prioritized: true, ownerInitials: 'MC', ownerName: 'Teck Soluções', nextMilestone: null, nextDate: null, progress: 100, itemCount: 0 },
  { slug: 'mascara-extensao-gestao-compra-divida', title: 'MÁSCARA | Extensão e Gestão de Compra de Dívida - data do primeiro vencimento para operações de compra de dívida', status: 'ok', prioritized: true, ownerInitials: 'MC', ownerName: 'Teck Soluções', nextMilestone: null, nextDate: null, progress: 100, itemCount: 0 },
  { slug: 'mascara-ajustes-relatorio-promotora', title: 'Máscara | Ajustes no relatório de promotora e operacional - Capital e ABC', status: 'ok', prioritized: true, ownerInitials: 'MC', ownerName: 'Teck Soluções', nextMilestone: null, nextDate: null, progress: 100, itemCount: 0 },
  { slug: 'mascara-implementacao-consignataria', title: 'MÁSCARA | Implementação da Consignatária na Cessão de Crédito', status: 'ok', prioritized: true, ownerInitials: 'MC', ownerName: 'Teck Soluções', nextMilestone: null, nextDate: null, progress: 100, itemCount: 0 },
  { slug: 'funcao-implementacao-mascara-edicao', title: 'FUNÇÃO | Implementação da Máscara de Edição', status: 'ok', prioritized: true, ownerInitials: 'MC', ownerName: 'Teck Soluções', nextMilestone: null, nextDate: null, progress: 100, itemCount: 0 },
  { slug: 'modulo-unico', title: 'Módulo da Único', status: 'ok', prioritized: true, ownerInitials: 'UN', ownerName: 'Teck Soluções', nextMilestone: null, nextDate: null, progress: 100, itemCount: 4 },
  { slug: 'portal-abc-kitdoc', title: 'Portal ABC | KITDOC', status: 'ok', prioritized: true, ownerInitials: 'KT', ownerName: 'Teck Soluções', nextMilestone: null, nextDate: null, progress: 100, itemCount: 0 },
  { slug: 'frontconsig-v1-convenios', title: 'FrontConsig V1 | Cadastro e gerenciamento de convênios', status: 'ok', prioritized: true, ownerInitials: 'CN', ownerName: 'Teck Soluções', nextMilestone: null, nextDate: null, progress: 100, itemCount: 0 },
  { slug: 'mascara-liberacao-rh', title: 'MÁSCARA | Liberação e aprovação pelo RH no cadastro de usuários', status: 'attention', prioritized: false, ownerInitials: 'MC', ownerName: 'Teck Soluções', nextMilestone: 'Homologação', nextDate: '14/09', progress: 80, itemCount: 0 },
  { slug: 'mascara-inss-proposta', title: 'MÁSCARA | INSS - cadastro de proposta, ajuste de máscaras (limite)', status: 'attention', prioritized: false, ownerInitials: 'MC', ownerName: 'Teck Soluções', nextMilestone: 'Homologação', nextDate: '15/09', progress: 70, itemCount: 0 },
  { slug: 'funcao-callback-api', title: 'Função | CallBack - criação do serviço de API para substituição do serviço do David', status: 'attention', prioritized: true, ownerInitials: 'IN', ownerName: 'Teck Soluções', nextMilestone: 'Homologação pela Teck - criar o serviço para ouvirmos as alterações de esteiras para movimentação de propostas automaticamente', nextDate: '17/09', progress: 62, itemCount: 1 },
  { slug: 'mascara-consulta-margem-esteiras', title: 'Máscara | Consulta de margem e averbação nas esteiras', status: 'attention', prioritized: true, ownerInitials: 'IN', ownerName: 'Teck Soluções', nextMilestone: 'Homologação pelo time de Produtos', nextDate: '16/09', progress: 49, itemCount: 3 },
  { slug: 'funcao-armazenamento-abc', title: 'Função | Armazenamento - criação e configuração das tabelas e estrutura para ABC', status: 'attention', prioritized: true, ownerInitials: 'IN', ownerName: 'Teck Soluções', nextMilestone: 'Em desenvolvimento pelo time de DevOps & Automação', nextDate: '14/09', progress: 30, itemCount: 0 },
  { slug: 'frontconsig-v2-abccard', title: 'FrontConsig V2 - ABCCARD', status: 'attention', prioritized: true, ownerInitials: 'IN', ownerName: 'Teck Soluções', nextMilestone: 'Construiremos como serviço, com suporte a múltiplas empresas (tenants), facilitando o suporte e a manutenção', nextDate: '21/09', progress: 20, itemCount: 0 },
  { slug: 'merito-testes-endpoints', title: 'Mérito | Testes nos endpoints e campos retornáveis', status: 'attention', prioritized: true, ownerInitials: 'IN', ownerName: 'Teck Soluções', nextMilestone: 'Pendente definição pelo time de produtos', nextDate: '14/09', progress: 20, itemCount: 0 },
  { slug: 'regulatorio-siloc', title: 'Regulatório | Adesão ao Siloc', status: 'ok', prioritized: true, ownerInitials: 'IN', ownerName: 'Teck Soluções', nextMilestone: 'Aguardando aprovação de custos das máquinas virtuais e conexões com a RTM', nextDate: '21/09', progress: 50, itemCount: 4 },
  { slug: 'regulatorio-pcr', title: 'Regulatório | Adesão ao PCR', status: 'ok', prioritized: true, ownerInitials: 'IN', ownerName: 'Teck Soluções', nextMilestone: 'Aguardando aprovação de custos das máquinas virtuais e conexões com a RTM', nextDate: '21/09', progress: 50, itemCount: 4 },
  { slug: 'fundo-passagem', title: 'Fundo de Passagem', status: 'attention', prioritized: true, ownerInitials: 'IN', ownerName: 'Teck Soluções', nextMilestone: 'Aguardando definição de Produtos', nextDate: '21/09', progress: 0, itemCount: 0 },
  { slug: 'envio-cet-abccard', title: 'Envio da CET - ABCCARD', status: 'blocked', prioritized: true, ownerInitials: 'IN', ownerName: 'Teck Soluções', nextMilestone: 'Aguardando aprovação de layout', nextDate: null, progress: 0, itemCount: 1 },
];
