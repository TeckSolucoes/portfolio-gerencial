# Como trabalhar neste backlog (orientações para qualquer IA)

Leia `docs/CONTEXTO.md` antes de começar. Responda sempre em **português do Brasil**.

## Fluxo obrigatório
1. `node scripts/backlog.mjs proximo` mostra o próximo item liberado (o mais importante cujas dependências já foram concluídas). `listar` mostra todos e `ver <ID>` o detalhe.
2. `node scripts/backlog.mjs iniciar <ID>` antes de mexer.
3. Faça o trabalho numa **branch nova a partir do `master` atualizado** (`git checkout master && git pull && git checkout -b <tipo>/<assunto>`).
4. Valide (todos devem passar): `npx tsc --noEmit` · `npx eslint` · `npx tsx --test $(find src scripts -name '*.test.ts')` · `node --test scripts/backlog.test.mjs` · `npm run build`. Se apagou rotas, rode `rm -rf .next/types` antes do `tsc`.
5. **Ao terminar, marque como concluído — obrigatório e no mesmo PR:**
   ```bash
   node scripts/backlog.mjs concluir <ID> --nota "o que foi feito e como validou"
   ```
   O comando atualiza `docs/backlog/backlog.json`, `docs/BACKLOG.md` e `docs/PACOTE-PARA-IAS.md`. Comite os três junto com o código. Se o item travar: `bloquear <ID> --motivo "..."`. Se reabrir: `reabrir <ID>`.
6. Abra o PR para `master` e faça o merge (o dono do projeto pediu: **sempre fazer merge** quando estiver verificado). Cada merge no `master` dispara deploy automático no EasyPanel.
7. Diga ao dono o que esperar no deploy (ver "Deploy" abaixo) e o que ele precisa fazer.

Item bloqueado por decisão do usuário (`DEC-*`) não se inventa: peça a decisão.

## Regras do projeto
- **Nunca inventar número, meta, pago ou nome.** Dado ausente = "indisponível"; meta de exemplo aparece como MODELO.
- **Segredos:** chave de API e senha nunca no chat, no código, no log nem no git. Só variável de ambiente do EasyPanel, ou cifradas no banco e nunca devolvidas ao navegador.
- **Dados de pessoas** (CPF, nome de cliente ou servidor) nunca no repositório. `data/transparencia/` e `data/cache/` são ignorados pelo git de propósito.
- **Acesso por empresa é falha-fechada** e filtrado no servidor (`src/lib/permissoes.ts`, `src/lib/acesso.ts`). Nunca mande o JSON completo a componente cliente.
- **Migrações do Prisma só aditivas** (`ALTER TABLE ADD COLUMN` / `CREATE TABLE`). Nada de recriar tabela nem apagar coluna/tabela sem backup. Valide: `prisma migrate deploy` em banco novo + `prisma migrate diff ... --exit-code` sem diferença, e teste o runner `scripts/aplicar-migracoes.cjs`.
- **Nunca** rodar `docker volume prune`, `docker system prune --volumes` ou qualquer limpeza que apague volumes: o volume `teck-portfolio-data` (SQLite) não tem backup.
- **Padrão de execução do dono:** trabalho não trivial com **agentes especialistas em paralelo** (frontend, pesquisa de fonte, produto/risco/técnico), arquivos disjuntos por agente. Quem coordena **confere o resultado** (tsc, testes, build) antes de aceitar.
- Workers são **código determinístico, sem IA e sem custo por execução** (`src/lib/workers`).
- Para telas, siga o padrão visual azul-marinho dos dashboards (`monitoramento`, `relatorio`, `diario-oficial`), CSS escopado por container, acessível, responsivo (375 px) e sem fonte nova. O admin usa o tema roxo do portal.
- Código: sem comentário que explique o "quê"; só o "porquê" não óbvio. Sem abstração prematura. Editar arquivo existente antes de criar novo.
- Código vindo de fora (patch, handoff): conferir hash, **revisar o conteúdo**, validar antes de subir.
- Se o ambiente **bloquear** uma ação (classificador de permissões), **pare e explique** ao dono. Não contorne por outro caminho.

## Deploy (EasyPanel)
- Serviço `web-rpa/web-portifolio-gerencial`; GitHub `TeckSolucoes/portfolio-gerencial`, branch `master`. Cada push no `master` implanta sozinho. **Evite vários merges seguidos.**
- Boot (`scripts/boot.sh`): `migracoes-pendentes.cjs` → se houver pendência, `aplicar-migracoes.cjs` (SQLite direto, espera o banco liberar) e, só se ele devolver 2, `prisma migrate deploy`; depois seed e `next start`.
- Sinais no log do container: "migracao aplicada: ...", "sem migracoes pendentes", "Ready". Falha: "falhou (tentativa N de 8)" + listagem de `/app/data`.
- Confirmar que a imagem nova subiu: no Terminal do serviço, **digitar** (não colar; o terminal quebra colagem): `ls /app/prisma/migrations`.
- Mudança de `Dockerfile` (ex.: novo pacote do sistema) exige **rebuild da imagem**, não só reiniciar.

## Definição de pronto
Critério do item (`criterioPronto`) cumprido, validações verdes, PR mergeado, item marcado com `concluir`, e o dono informado do que verificar em produção.
