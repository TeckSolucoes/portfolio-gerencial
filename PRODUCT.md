# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

O usuário primário é Patrício, Head de Projetos, que acompanha a operação e a evolução das empresas do grupo Teck. Gestores e colaboradores autorizados acessam recortes definidos por perfil, empresa e, quando aplicável, equipe do gerente.

## Product Purpose

O Portal Teck reúne informações executivas, operacionais e de acompanhamento em uma única ferramenta interna. Ele deve permitir decisões rápidas com dados confiáveis, atuais e auditáveis, reduzir consultas manuais dispersas e transformar sinais operacionais em ações acompanháveis.

O sucesso do produto significa apresentar uma visão gerencial coerente do grupo, manter as rotinas de monitoramento sob controle e permitir que cada usuário veja e execute somente o que lhe foi autorizado.

## Positioning

O portal combina dados internos das operações da Teck com fontes públicas e rotinas configuráveis. A informação é organizada pelas regras reais do negócio, por empresa e por responsabilidade, com gestão de acesso modular por perfil e usuário.

## Operating Context

- O portal roda no EasyPanel e é implantado automaticamente a partir da branch `master` do repositório GitHub `TeckSolucoes/portfolio-gerencial`.
- As empresas atualmente tratadas são AKRK e DIG.
- Função e Front V2 alimentam o Relatório Gerencial e representam o fluxo operacional das propostas.
- Front V1 é usado na Gestão de Carteira para identificar clientes que ainda não estão na base, gerar novos acionáveis e acompanhar o tratamento desses registros.
- Workers executam consultas e monitoramentos configuráveis, com possibilidade de ativação, desativação, agenda, execução manual e histórico.
- O produto é acessado em computadores e celulares por colaboradores autorizados.

## Capabilities and Constraints

- Relatório Gerencial por empresa e, quando autorizado, por equipe de gerente.
- Monitoramento de convênios, Diário Oficial, Transparência, Jurídico, NOC, Custos, metas, usuários e workers.
- Permissões modulares herdadas do perfil e ajustáveis individualmente por usuário.
- Escopo de dados por empresa e, opcionalmente, pela equipe de um gerente.
- Função e Front V2 não devem ser misturados com Front V1 de forma que duplique ou distorça os indicadores do Relatório Gerencial.
- Integrações com bancos de produção usam credenciais externas ao código, conexões somente leitura e falha fechada quando a fonte não está disponível.
- Dados pessoais, senhas, chaves e credenciais não podem ser gravados no repositório ou expostos em logs e relatórios técnicos.
- A Gestão de Carteira deve comparar identidades de forma protegida e idempotente, evitando persistir identificadores pessoais brutos quando eles não forem necessários.
- As rotinas precisam respeitar limites, periodicidade e disponibilidade de cada fonte.

## Brand Commitments

- O produto se chama Portal Teck e representa a Teck Soluções.
- O logotipo existente da Teck deve ser preservado como ativo oficial.
- A linguagem da interface deve ser clara, executiva e direta, em português do Brasil.

## Evidence on Hand

- Contexto consolidado do produto em `docs/CONTEXTO.md`.
- Regras, prioridades e decisões em `docs/BACKLOG.md`, `docs/backlog/backlog.json` e `docs/PACOTE-PARA-IAS.md`.
- Regras atuais do relatório em `src/lib/relatorio/` e evidência histórica em `src/lib/relatorio/evidencia.json`.
- Estrutura persistida do portal em `prisma/schema.prisma`.
- Implementação atual de navegação, páginas, permissões, workers e integrações em `src/`.
- Não há autorização para inventar clientes, depoimentos, resultados comerciais ou indicadores ausentes das fontes reais.

## Product Principles

1. Mostrar informação confiável, rastreável e atualizada antes de aumentar a quantidade de indicadores.
2. Traduzir dados operacionais em decisões e ações claras para o gestor.
3. Preservar o escopo de acesso e a privacidade desde a origem até a tela.
4. Manter integrações independentes, configuráveis e observáveis para que uma falha não comprometa o portal inteiro.
5. Aplicar o mesmo padrão de uso e conteúdo em todas as rotas, com adaptação adequada para celular.

## Accessibility & Inclusion

A experiência deve funcionar por teclado, usar rótulos acessíveis nos controles e manter leitura e operação adequadas em telas móveis.
