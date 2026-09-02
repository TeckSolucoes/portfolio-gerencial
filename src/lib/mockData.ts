import type { Company } from './types';

// Temporary/hardcoded stage (plan step 2): mirrors the approved mockup's `DATA` object
// verbatim (same 3 companies, same fronts/items, same copy, including `prioritized`).
// This whole module gets deleted and replaced by Prisma queries in a later step —
// the exported query helpers below (getCompany/getFront) are the seam that will be
// swapped to `async` Prisma-backed versions with the same signatures.

export const DATA: Record<string, Company> = {
  capitalconsig: {
    slug: 'capitalconsig',
    name: 'Capital Consig',
    tag: 'Crédito Consignado',
    tone: 'violet',
    tagline: 'Originação, análise de crédito e correspondência bancária para consignado.',
    fronts: [
      {
        id: 'esteira-digital',
        title: 'Esteira digital de contratação',
        status: 'attention',
        owner: 'Rafael Nunes',
        ownerInit: 'RN',
        prioritized: true,
        progress: 62,
        nextMilestone: 'Piloto com 3 correspondentes',
        nextDate: '15/09',
        summary:
          'Substituição do processo manual de assinatura por uma esteira <strong>100% digital</strong>, reduzindo o tempo de contratação de 5 dias para menos de 1 dia. O piloto começa com três correspondentes bancários parceiros antes da expansão nacional.',
        items: [
          { title: 'Integração com assinatura eletrônica', status: 'done', updated: 'ontem' },
          { title: 'Homologação com o primeiro correspondente', status: 'done', updated: 'há 3 dias' },
          { title: 'Ajuste de regras de crédito automatizado', status: 'doing', updated: 'hoje' },
          {
            title: 'Testes de carga do novo fluxo',
            status: 'blocked',
            updated: 'há 2 dias',
            note: 'Aguardando ambiente de homologação do fornecedor de assinatura.',
          },
          { title: 'Treinamento das centrais de atendimento', status: 'todo', updated: '—' },
        ],
      },
      {
        id: 'portabilidade',
        title: 'Programa de portabilidade de crédito',
        status: 'ok',
        owner: 'Camila Duarte',
        ownerInit: 'CD',
        prioritized: true,
        progress: 80,
        nextMilestone: 'Lançamento nacional',
        nextDate: '30/09',
        summary:
          'Nova jornada para portabilidade de contratos de outros bancos para a Capital Consig, com simulação automática de economia para o cliente. Já opera em <strong>4 estados</strong>, com resultado acima da meta.',
        items: [
          { title: 'Motor de simulação de economia', status: 'done', updated: 'há 5 dias' },
          { title: 'Homologação jurídica dos contratos', status: 'done', updated: 'há 4 dias' },
          { title: 'Expansão para mais 6 estados', status: 'doing', updated: 'hoje' },
          { title: 'Campanha de divulgação com correspondentes', status: 'todo', updated: '—' },
        ],
      },
      {
        id: 'analise-credito',
        title: 'Redução do tempo de análise de crédito',
        status: 'attention',
        owner: 'Bruno Salgado',
        ownerInit: 'BS',
        prioritized: false,
        progress: 45,
        nextMilestone: 'Nova régua de score',
        nextDate: '10/10',
        summary:
          'Reformulação da régua de crédito para reduzir o tempo médio de análise de <strong>48h para 6h</strong>, sem aumentar a inadimplência. Modelo em fase de validação estatística.',
        items: [
          { title: 'Levantamento de variáveis do novo modelo', status: 'done', updated: 'há 6 dias' },
          { title: 'Validação estatística do modelo', status: 'doing', updated: 'ontem' },
          { title: 'Integração com birôs de crédito', status: 'doing', updated: 'hoje' },
          { title: 'Aprovação do comitê de risco', status: 'todo', updated: '—' },
        ],
      },
      {
        id: 'cobranca',
        title: 'Cobrança e renegociação de contratos em atraso',
        status: 'blocked',
        owner: 'Larissa Prado',
        ownerInit: 'LP',
        prioritized: true,
        progress: 30,
        nextMilestone: 'Nova régua de cobrança ativa',
        nextDate: '05/10',
        summary:
          'Criação de uma régua de cobrança preventiva e canal de renegociação self-service, hoje feito manualmente pelo time. <strong>Bloqueado</strong> aguardando aprovação orçamentária para a nova plataforma de disparo de SMS/WhatsApp.',
        items: [
          { title: 'Desenho da régua de cobrança', status: 'done', updated: 'há 8 dias' },
          {
            title: 'Contratação de plataforma de disparo',
            status: 'blocked',
            updated: 'há 5 dias',
            note: 'Aguardando aprovação de orçamento pela diretoria financeira.',
          },
          { title: 'Portal self-service de renegociação', status: 'todo', updated: '—' },
        ],
      },
      {
        id: 'regulatorio',
        title: 'Adequação regulatória Bacen / LGPD',
        status: 'ok',
        owner: 'Diego Aquino',
        ownerInit: 'DA',
        prioritized: false,
        progress: 90,
        nextMilestone: 'Auditoria externa',
        nextDate: '20/09',
        summary:
          'Ajustes finais de conformidade com as novas resoluções do Banco Central para consignado digital e adequação do tratamento de dados pessoais. Fase final antes da auditoria externa.',
        items: [
          { title: 'Mapeamento de dados pessoais tratados', status: 'done', updated: 'há 10 dias' },
          { title: 'Ajuste de contratos e termos de uso', status: 'done', updated: 'há 2 dias' },
          { title: 'Auditoria externa de conformidade', status: 'doing', updated: 'hoje' },
        ],
      },
      {
        id: 'correspondentes',
        title: 'Integração com novos correspondentes bancários',
        status: 'ok',
        owner: 'Camila Duarte',
        ownerInit: 'CD',
        prioritized: false,
        progress: 70,
        nextMilestone: 'Onboarding do 5º correspondente',
        nextDate: '25/09',
        summary:
          'Expansão da rede de correspondentes bancários parceiros, ampliando a capilaridade de originação de novos contratos.',
        items: [
          { title: 'Integração técnica via API', status: 'done', updated: 'há 4 dias' },
          { title: 'Homologação comercial', status: 'doing', updated: 'ontem' },
          { title: 'Treinamento da equipe do correspondente', status: 'todo', updated: '—' },
        ],
      },
    ],
  },
  abccard: {
    slug: 'abccard',
    name: 'ABC Card · Apus',
    tag: 'Cartões & Meios de Pagamento',
    tone: 'ember',
    tagline: 'Cartão consignado, app Apus e meios de pagamento do grupo.',
    fronts: [
      {
        id: 'cartao-consignado',
        title: 'Lançamento do cartão consignado',
        status: 'attention',
        owner: 'Felipe Rangel',
        ownerInit: 'FR',
        prioritized: true,
        progress: 55,
        nextMilestone: 'Emissão piloto (500 cartões)',
        nextDate: '12/09',
        summary:
          'Novo cartão de crédito consignado com desconto automático em folha, integrado à esteira da Capital Consig. Piloto restrito antes do lançamento comercial.',
        items: [
          { title: 'Homologação com a processadora de cartões', status: 'done', updated: 'há 3 dias' },
          { title: 'Integração com a folha de pagamento', status: 'doing', updated: 'hoje' },
          { title: 'Aprovação da bandeira', status: 'doing', updated: 'ontem' },
          {
            title: 'Emissão física dos primeiros lotes',
            status: 'blocked',
            updated: 'há 4 dias',
            note: 'Atraso na gráfica fornecedora dos cartões físicos.',
          },
        ],
      },
      {
        id: 'app-apus',
        title: 'Nova versão do app Apus',
        status: 'ok',
        owner: 'Juliana Melo',
        ownerInit: 'JM',
        prioritized: true,
        progress: 68,
        nextMilestone: 'Beta fechado',
        nextDate: '18/09',
        summary:
          'Redesenho do aplicativo Apus com foco em autoatendimento — 2ª via de fatura, antecipação e central de ajuda — reduzindo o volume no call center.',
        items: [
          { title: 'Redesenho da tela inicial e navegação', status: 'done', updated: 'há 5 dias' },
          { title: 'Central de autoatendimento', status: 'doing', updated: 'hoje' },
          { title: 'Testes com grupo beta de clientes', status: 'doing', updated: 'ontem' },
        ],
      },
      {
        id: 'processadora',
        title: 'Migração de processadora de cartões',
        status: 'blocked',
        owner: 'Felipe Rangel',
        ownerInit: 'FR',
        prioritized: false,
        progress: 20,
        nextMilestone: 'Assinatura do novo contrato',
        nextDate: '01/10',
        summary:
          'Troca da processadora atual por uma com custo por transação menor e SLA de disponibilidade mais alto. Negociação contratual travada no jurídico do fornecedor atual.',
        items: [
          { title: 'RFP e seleção da nova processadora', status: 'done', updated: 'há 12 dias' },
          {
            title: 'Negociação contratual',
            status: 'blocked',
            updated: 'há 6 dias',
            note: 'Cláusula de multa contratual em revisão jurídica.',
          },
          { title: 'Plano de migração técnica', status: 'todo', updated: '—' },
        ],
      },
      {
        id: 'cashback',
        title: 'Programa de cashback e benefícios',
        status: 'ok',
        owner: 'Juliana Melo',
        ownerInit: 'JM',
        prioritized: false,
        progress: 75,
        nextMilestone: 'Expansão para toda a base',
        nextDate: '22/09',
        summary:
          'Programa de cashback em parceiros selecionados, hoje em teste com <strong>12% da base</strong>, com resultado positivo em ativação do cartão.',
        items: [
          { title: 'Motor de regras de cashback', status: 'done', updated: 'há 9 dias' },
          { title: 'Piloto com 12% da base', status: 'done', updated: 'há 2 dias' },
          { title: 'Expansão para 100% da base', status: 'doing', updated: 'hoje' },
        ],
      },
      {
        id: 'antifraude',
        title: 'Antifraude e segurança de transações',
        status: 'attention',
        owner: 'Diego Aquino',
        ownerInit: 'DA',
        prioritized: true,
        progress: 50,
        nextMilestone: 'Ativação do novo motor antifraude',
        nextDate: '28/09',
        summary:
          'Implementação de um novo motor de antifraude em tempo real para transações do cartão, reduzindo falsos positivos que hoje bloqueiam clientes legítimos.',
        items: [
          { title: 'Seleção do fornecedor de antifraude', status: 'done', updated: 'há 7 dias' },
          { title: 'Integração com o motor de transações', status: 'doing', updated: 'ontem' },
          { title: 'Calibragem de regras (redução de falso positivo)', status: 'todo', updated: '—' },
        ],
      },
      {
        id: 'maquininhas',
        title: 'Integração com rede credenciada de maquininhas',
        status: 'ok',
        owner: 'Felipe Rangel',
        ownerInit: 'FR',
        prioritized: false,
        progress: 40,
        nextMilestone: 'Certificação com a bandeira',
        nextDate: '15/10',
        summary:
          'Ampliação da aceitação do cartão ABC Card em maquininhas de terceiros, além da rede própria.',
        items: [
          { title: 'Especificação técnica de integração', status: 'done', updated: 'há 6 dias' },
          { title: 'Certificação com a bandeira', status: 'doing', updated: 'hoje' },
        ],
      },
    ],
  },
  evolucaoteck: {
    slug: 'evolucaoteck',
    name: 'Evolução Teck Soluções',
    tag: 'Evolução Interna',
    tone: 'teal',
    tagline:
      'Sistemas, processos e ferramentas internas da própria Teck — o motor por trás das outras duas empresas.',
    fronts: [
      {
        id: 'erp-interno',
        title: 'Desenvolvimento do ERP interno',
        status: 'attention',
        owner: 'Marcos Ivo',
        ownerInit: 'MI',
        prioritized: true,
        progress: 40,
        nextMilestone: 'Módulo financeiro em homologação',
        nextDate: '20/10',
        summary:
          'Construção de um ERP próprio para consolidar financeiro, pessoas e ativos da Teck, substituindo planilhas e sistemas fragmentados. O módulo financeiro é a primeira entrega, seguido por RH e ativos.',
        items: [
          { title: 'Levantamento de requisitos com o financeiro', status: 'done', updated: 'há 9 dias' },
          { title: 'Modelagem do banco de dados', status: 'done', updated: 'há 5 dias' },
          { title: 'Módulo financeiro (contas a pagar/receber)', status: 'doing', updated: 'hoje' },
          {
            title: 'Integração com o banco para conciliação automática',
            status: 'blocked',
            updated: 'há 3 dias',
            note: 'Aguardando definição do banco parceiro para abertura de API.',
          },
          { title: 'Módulo de RH e folha', status: 'todo', updated: '—' },
        ],
      },
      {
        id: 'sonar',
        title: 'Implantação do Sonar (qualidade de código)',
        status: 'ok',
        owner: 'Patrícia Freire',
        ownerInit: 'PF',
        prioritized: false,
        progress: 85,
        nextMilestone: 'Quality gate obrigatório em todos os repositórios',
        nextDate: '10/09',
        summary:
          'Adoção do SonarQube para analisar qualidade e segurança do código automaticamente em todos os projetos da Teck, bloqueando o merge de código com problemas críticos.',
        items: [
          { title: 'Instalação e configuração do servidor Sonar', status: 'done', updated: 'há 14 dias' },
          { title: 'Integração com o pipeline dos 3 primeiros squads', status: 'done', updated: 'há 6 dias' },
          { title: 'Definição dos critérios de quality gate', status: 'done', updated: 'há 4 dias' },
          { title: 'Rollout para os squads restantes', status: 'doing', updated: 'ontem' },
        ],
      },
      {
        id: 'central-ia',
        title: 'Central de Inteligência Executiva',
        status: 'attention',
        owner: 'Rodrigo Cunha',
        ownerInit: 'RC',
        prioritized: true,
        progress: 25,
        nextMilestone: 'Validação do conceito visual com a diretoria',
        nextDate: '15/09',
        summary:
          'Ferramenta que vai permitir ao dono do grupo perguntar em linguagem natural e ver o portfólio consolidado das empresas — a própria tela que você está usando agora. Ainda em fase de protótipo, antes da integração real com o Jira.',
        items: [
          { title: 'Exploração de 3 direções visuais', status: 'done', updated: 'há 4 dias' },
          { title: 'Escolha da direção visual com o dono', status: 'done', updated: 'há 2 dias' },
          { title: 'Portfólio de projetos por empresa (esta tela)', status: 'doing', updated: 'hoje' },
          { title: 'Integração real com a API do Jira', status: 'todo', updated: '—' },
          { title: 'Camada de IA para respostas em linguagem natural', status: 'todo', updated: '—' },
        ],
      },
      {
        id: 'cicd',
        title: 'Padronização da esteira de CI/CD',
        status: 'ok',
        owner: 'Patrícia Freire',
        ownerInit: 'PF',
        prioritized: false,
        progress: 60,
        nextMilestone: 'Esteira padrão para squads de mobile',
        nextDate: '30/09',
        summary:
          'Unificação dos pipelines de build, teste e deploy de todos os squads em um único padrão, reduzindo o tempo de deploy de horas para minutos.',
        items: [
          { title: 'Pipeline padrão para squads web', status: 'done', updated: 'há 11 dias' },
          { title: 'Pipeline padrão para squads de API', status: 'done', updated: 'há 7 dias' },
          { title: 'Adaptação para squads mobile', status: 'doing', updated: 'ontem' },
        ],
      },
      {
        id: 'observabilidade',
        title: 'Observabilidade e monitoramento de sistemas',
        status: 'blocked',
        owner: 'Marcos Ivo',
        ownerInit: 'MI',
        prioritized: false,
        progress: 15,
        nextMilestone: 'Contratação da ferramenta de observabilidade',
        nextDate: '05/10',
        summary:
          'Monitoramento centralizado de logs, métricas e alertas para todos os sistemas da Teck, hoje acompanhados de forma isolada por cada squad.',
        items: [
          { title: 'Mapeamento dos sistemas críticos', status: 'done', updated: 'há 8 dias' },
          {
            title: 'Seleção da ferramenta de observabilidade',
            status: 'blocked',
            updated: 'há 5 dias',
            note: 'Aguardando aprovação orçamentária para a licença anual.',
          },
          { title: 'Instrumentação dos sistemas críticos', status: 'todo', updated: '—' },
        ],
      },
      {
        id: 'sso',
        title: 'SSO e padronização de acessos internos',
        status: 'ok',
        owner: 'Renata Sabino',
        ownerInit: 'RS',
        prioritized: false,
        progress: 55,
        nextMilestone: 'Migração dos sistemas legados para SSO',
        nextDate: '25/09',
        summary:
          'Login único para todos os sistemas internos da Teck, eliminando senhas duplicadas e reduzindo o risco de acesso indevido.',
        items: [
          { title: 'Implantação do provedor de identidade', status: 'done', updated: 'há 10 dias' },
          { title: 'Integração dos sistemas novos', status: 'done', updated: 'há 6 dias' },
          { title: 'Migração dos sistemas legados', status: 'doing', updated: 'hoje' },
        ],
      },
    ],
  },
};

export function listCompanies(): Company[] {
  return Object.values(DATA);
}

export function getCompany(companySlug: string): Company | undefined {
  return DATA[companySlug];
}

export function getFront(companySlug: string, frontSlug: string) {
  const company = getCompany(companySlug);
  const front = company?.fronts.find((f) => f.id === frontSlug);
  return front ? { company, front } : undefined;
}
