# Estratégia de testes

## Evidência anterior ao PRD-17

Em 05/10/2026, TypeScript, ESLint, 158 testes da aplicação e 5 testes do backlog passaram na base de origem da branch.

## Gates do PRD-17

- unitários para normalização, aliases, vigência e centavos;
- integração SQLite para transações e sobreposições;
- contratos read-only das bases externas;
- dataset dourado aprovado pelo negócio;
- E2E por perfil, empresa e viewport;
- validação de autorização direta em página, action e API;
- reconciliação entre KPI, drill-down, WhatsApp e exportação;
- build de produção e migração em banco novo;
- revisão de segurança, UX e código independentes.

## Evidências parciais — 06/10/2026

- Gate UX: aprovado em revisão de código após ajustes de feedback, foco, teclado, celular e cobertura vazia. Não equivale a homologação visual em navegador.
- RBAC: 22 testes focados aprovados; papel atual do banco substitui papel antigo do JWT na autorização privilegiada.
- TypeScript, lint e build passaram antes da última rodada de correções de dados; repetir após estabilização.
- Migração em SQLite novo: aprovada na rodada anterior.
- Testes de dados em revisão: não considerar a regressão anterior como aprovação do código alterado depois.
- Shadow mode, amostra real, comparação centavo a centavo e E2E por perfil: pendentes.

## Dependências

Next.js 16.3.8 e override fast-uri 3.1.8 eliminam os apontamentos corrigíveis desta rodada. Restam quatro entradas HIGH propagadas pelo Prisma: deepmerge-ts 7.1.5 (processa configuração local) e mysql2 3.15.3 interno do CLI. O Prisma usa SQLite; as conexões MySQL da aplicação usam mysql2 3.24.4. A sugestão automática de downgrade para Prisma 6.19.3 é incompatível com o adapter e cliente atuais. Risco residual registrado, sem declarar auditoria limpa; revisar atualização compatível antes de homologar produção.

Rodada final local de 06/10/2026: 199/199 testes, TypeScript, ESLint e build de produção aprovados. Homologação de dados reais permanece pendente.

## 08/10/2026 — Promotoras e Escritório
9 testes relevantes aprovados (domínio escritório/promotoras e integração SQLite promotoras). TypeScript e build aprovados; revisão independente de autorização/transações concluída. Teste visual e interação entre sessões ainda pendentes.

## Weeky — 09/10/2026
- 28 testes aprovados: Weeky (4), snapshot (6), permissões (18).
- QA independente aprovou regras e isolamento antes da leitura do snapshot; revisão de código de UI incluiu atualização defasada e valores grandes no celular.
- Sem homologação visual em navegador, sem validação numérica contra produção e sem deploy nesta etapa.

## ORG-01 — evidências09/10/2026
- 38 testes aprovados: promotoras domínio/SQLite, fotos formato/stream/persistência/origem, endpoint HTTP real com sessão/permissão/Prisma simulados, regressão permissões.
- TypeScript, ESLint e build Next aprovados.
- Revisão independente UI/segurança e QA: filtro global e proxy corrigidos; sem bloqueadores restantes nos cenários testados.
- Prévia local isolada do componente com fixtures: desktop e breakpoint móvel; filtro AKRK remove DIG; busca101 expande caminho; clique abre callback p1; sem overflow horizontal global. Não equivale a homologação em produção.
- Upload integrado real em ambiente de produção, fotos Orion e dados reais ainda não homologados.
