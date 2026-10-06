## Problema e resultado

Os relatórios dependiam de nomes textuais e não tinham cadastro versionado da hierarquia comercial. Esta alteração adiciona Estrutura Comercial, vínculos por vigência e identidade de gerente por ID, além de distinguir contratado, liberado e cobertura da conciliação.

Inclui correções de permissões, interface acessível, testes de transação SQLite e rotina de conciliação de nomes a partir do snapshot local. A rotina nasce desligada e pode ser configurada em Workers.

## Validação

- 199 testes aprovados.
- TypeScript aprovado.
- Revisão independente de UX e testes de serviço.
- Sem acesso a produção nesta rodada.

## Pendências antes do merge

- Homologar amostra real e SQL das fontes.
- Confirmar data oficial de integração: primeira release ainda é a evidência utilizada.
- Resolver cobertura de propostas anteriores aos 32 dias integradas no mês.
- Homologação visual e por perfil.
- Backup do volume antes do deploy e avaliação dos quatro avisos HIGH transitivos do Prisma.

Este PR deve permanecer em rascunho até fechar esses itens. Migration aditiva; rollback e limitações em REPORTS/04-execution.md.
