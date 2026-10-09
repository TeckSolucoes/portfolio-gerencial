# Registro de execução

## 2026-10-05 — PRD-17

**Agente:** Orquestrador e especialistas
**Status:** PARTIAL
**Objetivo:** iniciar Confiabilidade dos números e Estrutura Comercial.
**Executado:** diagnóstico multidisciplinar, definição do MVP, criação de branch isolada, registro no backlog e distribuição da primeira onda.
**Arquivos afetados:** documentos operacionais e backlog.
**Validações:** baseline com TypeScript, ESLint, 158 testes da aplicação, 5 testes do backlog e backlog válido.
**Resultado:** implementação em andamento.
**Impacto funcional:** ainda não implantado.
**Backlog gerado:** PRD-17.

## 2026-10-06 — PRD-17: correções dos gates

**Agente:** Orquestrador, Tech/Data, QA/Segurança e UX/UI
**Status:** PARTIAL
**Executado:** integração inicial da hierarquia e do cadastro de usuários; revisão independente identificou atribuição histórica incompleta, inferência indevida da data de integração, estado persistente indevido no snapshot e escrita de pendências no GET. Correções em andamento. Modais receberam feedback, bloqueio de envio repetido, controle de foco e teclado; histórico mantém ação no celular; cobertura vazia não indica 100%; cadastros órfãos são identificados. Autorização de superadmin passou a consultar o papel atual no banco. Next atualizado para 16.3.8 e fast-uri para 3.1.8.
**Validações:** UX passou na revisão de código; TypeScript e lint da interface passaram. Gate anterior registrou build aprovado; os resultados precisam ser repetidos após as mudanças de dados. Audit de produção: 0 críticos e 4 altos transitivos no Prisma.
**Resultado:** nenhum merge ou deploy realizado; homologação real pendente.
**Impacto funcional:** implementação local na branch feat/estrutura-comercial-confiabilidade.
**Backlog gerado:** limitações de cobertura/integração e dependências registradas no PRD-17.

## 2026-10-07 — Carga pequena PRD-17
Agente: Orquestrador; revisão independente validar_amostra.
Status: DONE (amostra; reprocessamento completo pendente).
Executado: carga autorizada a partir do snapshot Front V2 AKRK de 06/10, sem nova consulta externa. Criados 1 gerente, 1 equipe, 2 vendedores, 4 aliases front_v2 e 3 vínculos. Transação imediata condicionada às tabelas vazias; FK ativada. Autor dos registros: carga-amostra-autorizada-2026-10-07. Vigência: 07/10/2026, sem retroatividade. Equipe selecionada com único gerente no snapshot e operadores presentes em uma só equipe.
Validação: tela de produção confirmou contadores 1/1/2 e equipe AKRK - PRAIA DO FORTE vinculada. Revisão independente confirmou schema, datas e controles. Não houve mudança de usuários, snapshots ou regras financeiras.
Limitação: amostra não homologa histórico, completude da hierarquia ou valores do relatório. Restante da base e reprocessamento dependem da próxima etapa.

## 2026-10-08 — PROM-01 / PROM-02 / OFFICE-01
Status: PARTIAL (implementação local concluída; homologação pendente).
Execução em paralelo: backend promotoras, frontend promotoras e escritório virtual. Menu com Organograma Promotoras e Escritório Virtual; NOC permanece último. Promotoras têm histórico/auditoria transacionais, validação CNPJ, unicidade de código por empresa/origem e gerente da mesma empresa. Escritório usa equipes vigentes, autor autenticado, heartbeat e mensagens persistidas. Corrigidos troca de sala/rascunho durante envio e falso erro após mensagem já persistida.
Validações: 9 testes aprovados pelo QA independente, Prisma generate, TypeScript e build aprovados.
Impacto: migrations aditivas locais; nenhuma publicação ou mudança de produção nesta etapa.
Limitações e próximos passos: REPORTS/08-promotoras-escritorio.md.

## 2026-10-08 — Carga AKRK em produção
Autorização explícita: usuário solicitou preencher os times com dados disponíveis e imagens.
Resultado confirmado no navegador: 23 equipes no Escritório Virtual. Carga criou 3 gerentes, 22 equipes, 270 vendedores e 292 vínculos; preservados 1 gerente, 1 equipe e 2 vendedores existentes. Totais: 4 gerentes, 23 equipes, 272 vendedores. Fonte: snapshot Front V2 de 06/10/2026; quatro gerentes conferidos com a referência AKRK enviada. Itália excluída por gerente inconsistente. Não representa cadastro oficial de RH nem assegura atividade atual de todos os operadores do snapshot.
Backup SQLite consistente e auditoria de IDs salvos em data/backups no volume de produção. Transação immediate, foreign_key_check sem erros; não alterados usuários/permissões ou vínculos preexistentes. Novos vínculos com vigência 08/10. Cadastros/aliases podem melhorar resolução nominal histórica, sem retroagir os novos vínculos.
Promotoras externas e níveis de superintendência não importados: diferentes da hierarquia gerente/equipe/vendedor. Sem novo deploy.

## 09/10/2026 — WEEKY-01
Agentes: Back-end, Front-end/UX, QA independente e orquestrador.
Status: PARTIAL — implementação local concluída; homologação visual e publicação pendentes.
Executado: nova rota /weeky e menu; últimos sete dias incluindo hoje em São Paulo; comparação anterior, evolução diária, mix, equipes, cancelamentos, integrações identificadas e qualidade. Usa snapshot v3 existente, sem consultas externas. Acesso exige relatório, empresa autorizada e visão Geral.
Validações: 28 testes aprovados, revisão independente, build Next aprovado. Lint identificou Date.now na renderização; cálculo transferido ao loader para preservar pureza.
Limitações: sem navegador/e2e e conciliação contra produção; integrações limitadas à extração disponível; agrupamento comercial da origem, sem aplicar novos vínculos oficiais. Rollback: reverter código, sem migrations.
Arquivos: src/app/(dashboard)/weeky, src/lib/relatorio/weeky*, src/components/Header.tsx e documentação operacional.
Próxima ação: homologação visual, PR mediante solicitação e aprovação de publicação.

## 09/10/2026 — Diagnóstico implantação Weeky
Status: PARTIAL.
PR #55 mergeado em master7ce7966. EasyPanel exibe warning; log de construção termina em npm ci sem conclusão/export. Consulta somente leitura ao container confirmou ausência de Weeky e do ID de Server Action reportado. Build ativo6dnMfUr8j8yaS4cLFKeRn. Origem da chamada incompatível ainda não identificada. Diagnóstico revisado independentemente; nenhuma evidência suficiente para patch/chave. Nenhuma configuração, dado ou deploy alterado. Próxima ação: implantação master mediante aprovação e validação do novo container.

## 09/10/2026 — ORG-01
Status: PARTIAL (implementação e gates locais concluídos; publicação pendente).
Executado: organograma comercial inspirado na referência Orion; Roberto no topo, AKRK e DIG separados, cartões de gerentes e promotoras, busca/expansão, upload de fotos raster privadas até2MB. Integrado em Estrutura Comercial; CRUD e histórico preservados. Removidos interface, Server Actions, polling e serviços do Escritório Virtual e antigo item lateral; URLs redirecionam. Não apagados dados/tabelas/migrations.
Gates: revisão independente encontrou filtro global contraditório e Origin interno atrás de proxy; corrigidos com filtro exclusivo da visão e origem pública configurada. QA independente testou endpoint real com acesso simulado e armazenamento temporário. 38 testes; lint/TypeScript/build. Prévia interativa isolada verificou filtro, busca, expansão, callback de detalhes e layout móvel sem overflow global.
Limitações: dados da prévia são fixtures somente externas ao produto; nenhum cadastro ou foto fictício inserido no banco. Fotos e cadastros externos do Orion não importados. Nenhum deploy/infra alterado.
Rollback: reverter commit de código; nenhum schema migrado.

## 2026-10-09 — COMP-01
Agente: Orquestrador, Dados e UI com revisão independente cruzada.
Status: DONE (implementação e gates locais).
Objetivo: comparação sutil da produção AKRK × DIG.
Executado: agregador de snapshots com acesso antes da leitura; componente e integração Home/relatório/Weeky. Gates corrigiram contratado negativo, elegibilidade divergente do diário e referência impossível.
Arquivos: comparativo-empresas.ts/test.ts, ComparativoEmpresas.tsx/CSS, três páginas e documentação operacional.
Validações: 60 testes; lint; prévia desktop e liderança; DOM responsivo sem overflow; TypeScript e build aprovados.
Resultado: revisão técnica aprovada; publicação/homologação real pendentes.
Impacto funcional: novo comparativo de contratado; regras existentes preservadas.
Backlog gerado: nenhum novo requisito; limites registrados em TESTING e CURRENT_STATE.
