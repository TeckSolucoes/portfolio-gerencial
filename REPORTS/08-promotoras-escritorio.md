# Promotoras e Escritório Virtual — 08/10/2026

Status: PARTIAL.

Implementados cadastro de promotoras e escritório por equipes, em paralelo, com menu próprio. Promotoras não são equipes internas e não alteram a atribuição dos relatórios. Cadastros vazios não recebem dados fictícios.

QA independente: 9 testes aprovados (incluindo SQLite real para promotoras); autorização revisada; findings de auditoria, gerente inativo e troca de sala durante envio tratados. TypeScript e build Next aprovados. Textarea bloqueado durante envio para evitar perda de novo rascunho.

Limites: sem validação visual no navegador ou teste end-to-end entre sessões nesta rodada. O escritório é uma representação espacial leve, não uma réplica 3D do Podman; chat textual com consulta a cada 15 segundos. A primeira tela de promotoras é tabela/cadastro, sem organograma visual multinível. Acesso restrito a superadmin + hierarquia. Política de retenção e ampliação para perfis comerciais aguardam decisão.

Implantação: duas migrations aditivas. Backup consistente SQLite antes de migrar; rollback do código preserva tabelas adicionadas. Nenhum deploy executado. Homologação e aprovação de go-live pendentes.
