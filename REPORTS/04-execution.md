# PRD-17 — Implementação para revisão

Data: 06/10/2026. Status: PARTIAL.

Implementados Estrutura Comercial, vínculos versionados, aliases, fila de nomes, associação de usuários por ID, controles de autorização e distinção de contratado/liberado. Relatório e Em Atenção consomem a hierarquia por vigência. Worker de conciliação usa snapshots locais e nasce desligado.

Validação atual: 199 testes aprovados e TypeScript aprovado. Build e lint registrados no resultado final da rodada. Revisão UX de código aprovada; testes de serviço usam SQLite temporário. Nenhuma consulta de produção nesta rodada.

Pendências para go-live: homologação visual e amostra real; confirmar o evento oficial de integração (o código usa a primeira release disponível); garantir cobertura das integrações de propostas criadas antes da janela de 32 dias; validar SQL e índices das fontes; revisar quatro apontamentos HIGH transitivos do CLI Prisma. PRD-17 permanece em andamento.

Implantação: fazer backup consistente do volume SQLite antes de aplicar a migração aditiva. Rollback de código deve usar a revisão anterior; manter backup para recuperação do banco. Não apagar volume nem recriar banco. Merge em master pode disparar o EasyPanel; autorização do usuário para merge recebida em 06/10/2026, mas gates de dados ainda precisam fechar.
