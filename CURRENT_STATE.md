# Estado atual

Projeto: Portal Teck.
Atualizado: 08/10/2026.
Etapa: Promotoras e Escritório Virtual — revisão local.
Status: implementação concluída; homologação visual e publicação pendentes.

Última entrega em produção: PR #52 e pequena amostra comercial (1 gerente, 1 equipe, 2 vendedores).
Entrega local: Organograma Promotoras no menu, cadastro/edição com busca, filtros, histórico e validações; Escritório Virtual com salas por equipe, presença com expiração em 90 segundos e mensagens por sala.
Validações: nove testes aprovados, Prisma gerado, TypeScript e build aprovados. Revisão independente corrigiu corrida na troca de sala durante envio; campo de mensagem bloqueado durante envio para preservar rascunho.
Limitações: primeira visão de promotoras é cadastral, ainda sem árvore visual multinível/importação. Escritório tem representação espacial leve, não replica o 3D do projeto Podman. Acesso permanece superadmin com permissão hierarquia. Sem áudio/vídeo. Validação visual em navegador e integração multissessão pendentes.
Próximas ações: homologar interface e interação, revisar liberação para perfis dos times e retenção do chat, abrir PR quando solicitado, aplicar migrations aditivas após aprovação de implantação.
Bloqueios de dados mantidos: validar origem oficial e cobertura do ranking de integrações; homologar números históricos. Cadastros de promotoras não alteram os relatórios automaticamente.
Agentes ativos: nenhum após revisão.
Último report: REPORTS/08-promotoras-escritorio.md.

08/10/2026 — Carga AKRK em produção concluída: 4 gerentes, 23 equipes, 272 vendedores. Escritório confirmou 23 salas de equipe. Itália pendente por inconsistência de gerente; promotoras externas permanecem sem carga. Snapshot de origem 06/10/2026, não cadastro de RH atualizado.

09/10/2026 — Weeky implementado localmente em feat/weeky-executivo: dashboard estratégico dos últimos sete dias, comparação anterior, evolução, mix, equipes e pontos de atenção. 28 testes e build aprovados; QA independente sem bloqueadores. Integração usa snapshot persistido e não acrescenta consultas às fontes. Homologação visual, PR e go-live pendentes. Report atual: REPORTS/09-weeky.md. Ponytail full adotado nas orientações globais C:/Users/pflen/.codex/AGENTS.md, skill instalada e referência local preservada.
