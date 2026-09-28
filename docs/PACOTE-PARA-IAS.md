# Pacote para IAs — Portal Teck

Arquivo único para colar em outra IA: contexto, regras de trabalho e backlog. Fonte: pasta `docs/` do repositório `TeckSolucoes/portfolio-gerencial`.

---

# Contexto-chave do Portal Teck (Painel Executivo)

Estado em **27/09/2026**. Dono: Patrício (Head de Projetos). Empresas do grupo tratadas: **AKRK** e **DIG** (consignado).

## O que é
Portal interno (Next.js 16 App Router, TypeScript, Prisma 7 + SQLite via better-sqlite3, NextAuth v5 credenciais + bcrypt) com: home (mercado, Bolsa, Banco Central, notícias, atalhos), **Relatório Gerencial**, **Monitoramento** de convênio fora do padrão, **Diário Oficial** (alterações de regras do consignado), **Transparência** (clientes novos entre servidores federais), e área de admin (usuários e permissões, metas por empresa, workers).

## Onde roda
- **EasyPanel** (VPS): serviço `web-rpa/web-portifolio-gerencial`, Docker multi-stage (`Dockerfile`), volume `teck-portfolio-data` em `/app/data` (SQLite `teck-portfolio.db`). **Sem backup do volume.**
- **GitHub:** `TeckSolucoes/portfolio-gerencial`, branch `master`. Push no `master` implanta sozinho.
- Variáveis de ambiente relevantes: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, reCAPTCHA (`NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY`), opcional `PORTAL_SERVIDORES_URL`. `PORTAL_TRANSPARENCIA_CHAVE` **não é mais usada** (guardar a chave: volta nas sanções).

## Mapa do código
- `src/lib/relatorio/` motor do relatório (casos, lote, pagou/morreu/jornada); `evidencia.json` = retrato fixo do export do Front (31/07–18/09).
- `src/lib/monitoramento/` detector (INÉDITO/RARO/PICO) sobre `evidencia.json`.
- `src/lib/diarios/` um adaptador por diário (MA, TO, SP, PB, MG, SP capital, Imperatriz) + `diarioOficial.ts` (DOU).
- `src/lib/workers/` agendador (`instrumentation.ts` liga no boot), registro, motor, cache em `data/cache/`, horários 08:00/13:00/19:00 (Brasília).
- `src/lib/transparencia/` mapeamento mensal do arquivo SIAPE, clientes novos, base de clientes por hash, planilha CSV.
- `src/lib/funcionalidades.ts`, `permissoes.ts`, `acesso.ts`, `authz.ts` catálogo de módulos, herança por perfil, exceções por usuário e proteção no servidor; `empresas.ts`, `metas.ts` recorte dos dados.
- `scripts/boot.sh`, `aplicar-migracoes.cjs`, `migracoes-pendentes.cjs` boot e migração; `scripts/backlog.mjs` este backlog.

## Acesso
Perfis: `superadmin`, `gerente`, `visualizador`. Cada módulo pode ser ligado ou desligado no perfil e receber exceção individual (herdar, liberar ou bloquear); as regras são lidas do banco a cada request e aplicadas no menu, página, action e API. Cada usuário também tem **empresas liberadas** (`AKRK`,`DIG`) e, opcional, **turma de um gerente**. Sem empresa = não vê relatório (de propósito). Empresa da equipe vem do prefixo (`AKRK - ...`); **a regra da DIG é uma suposição** (DEC-1).

## Regras do relatório (resumo)
- Caso = CPF (dígitos) + tipo (Adiantamento > Compra > Novo) + produto. Lote = dia da 1ª proposta.
- Fim do caso: alguma integrada = Pagou; senão a última proposta: Cancelada = Morreu/Cancelado; esteira reprovada = Morreu/Reprovado CCNET; Front reprovado sem código = Morreu/Reprovado Front; resto = Jornada.
- Taxa de morte = morreu / (pagou + morreu); em branco se ninguém fechou.
- Prova 17/09 (Geral): 122 propostas R$ 977.184,26; 82 novas; 40 reinseridas; 1.331 casos; 578 pagou. "Morreu" hoje 290 (prova 289): sem a esteira do CCNET (DAD-1).
- Valor usado = "Valor Contrato". Desempate de propostas do mesmo dia: número decrescente (reproduz a prova).

## Fontes e limites
Portal da Transparência federal (API: 400/min de dia, 700/min 00–06h, 180/min nas restritas; **não publica descontos nem margem**); DOU e diários estaduais/municipais (sem limite publicado, endpoints internos); Banco Central SGS; Yahoo Finance (não oficial); Google Notícias (uso pessoal). Detalhes por fonte em `docs/BACKLOG.md` (DAD-4, TEC-2).

## O que já está no ar / entregue
Relatório e Monitoramento por empresa; metas por empresa em tela; Diário Oficial (8 fontes) com cache; 15+ workers com tela em grade; usuários com permissões modulares por perfil e pessoa; Custos com cadastro, periodicidade, competência e pagamento; Transparência (SIAPE) com planilha e indicador; runner de migração no boot (causa raiz do `database is locked`: o `prisma migrate deploy` não espera quando o container antigo está conectado).

## Bloqueios e cuidados conhecidos
- O classificador de permissões do Claude Code já barrou: coleta em massa de nomes de servidores (mais tarde liberada pelo dono), push de código vindo de patch externo (liberado por pedido explícito). **Não contornar**: explicar ao dono.
- O EasyPanel entrou em crash loop (INF-1). Terminal do EasyPanel quebra colagem: digitar comandos.
- Nenhuma tela foi conferida visualmente por IA (INF-10).

## Onde está o backlog
`docs/BACKLOG.md` (leitura) · `docs/backlog/backlog.json` (fonte) · `docs/backlog/insumos.md` (texto-base) · `docs/backlog/COMO-USAR.md` · `docs/PACOTE-PARA-IAS.md` (tudo em um arquivo).

---

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

---

# Backlog — Portal Teck (Painel Executivo)

Atualizado em 2026-09-28. **Gerado por `node scripts/backlog.mjs render` a partir de `docs/backlog/backlog.json`: não edite este arquivo à mão.**

**Ao terminar um item, marque como concluído** (obrigatório, no mesmo PR do trabalho):

```bash
node scripts/backlog.mjs concluir <ID> --nota "o que foi feito e como validou"
```

Orientações completas: `docs/backlog/COMO-USAR.md`. Contexto do projeto: `docs/CONTEXTO.md`.

## Resumo

- Pendentes: 29 · Em andamento: 1 · Bloqueados: 8 · Concluídos: 13
- Próximo item liberado: **INF-2** Snapshot manual do VPS/volume antes de qualquer limpeza

## Itens em aberto (do mais importante para o menos importante)

- [ ] **INF-2** Snapshot manual do VPS/volume antes de qualquer limpeza
  - impacto alto · esforço P · dono: usuário
  - Pronto quando: Snapshot do VPS (ou cópia do volume teck-portfolio-data) feito e datado. É o único backup possível hoje.
  - Riscos: RSK-3
  - Notas: Nunca rodar docker volume prune / system prune --volumes: com o serviço parado o volume aparece como sem uso e seria apagado.

- [ ] **INF-1** Estabilizar o EasyPanel (crash loop do próprio painel)
  - impacto alto · esforço P · dono: usuário
  - Pronto quando: Dashboard do EasyPanel sem crash loop; medidores de Memória e Disco com folga; sem alerta novo por 48 h.
  - Riscos: RSK-3, RSK-4
  - Notas: Suspeita: disco cheio (cache de builds) ou memória. Limpar só imagens antigas e cache de build; nunca volumes.

- [~] **INF-3** Confirmar em produção os deploys dos PRs 10 a 13 e a 1ª execução do worker de servidores federais
  - impacto alto · esforço P · dono: usuário + IA · depende de: INF-1
  - Pronto quando: ls /app/prisma/migrations lista 8 migrações (feito); /admin/workers abre; worker 'Servidores federais (mapeamento mensal)' executado com sucesso (ou erro claro do formato do arquivo).
  - Riscos: RSK-4
  - Notas: Container novo já no ar (8 migrações na imagem). Falta ver Workers e executar o worker de servidores.

- [ ] **INF-10** Conferência visual e teste ponta a ponta das telas (nenhuma foi vista renderizada por IA)
  - impacto alto · esforço M · dono: IA + usuário · depende de: INF-3 · **aguarda dependências**
  - Pronto quando: Cada tela aberta logada como superadmin, gerente e visualizador, em 1280 px e 375 px: home, relatório, monitoramento, diário oficial, transparência, admin (usuários, metas, workers). Contraste medido. Um teste E2E (Playwright) cobrindo login e as rotas principais.
  - Notas: Só foi calculado contraste, nunca medido. Testes hoje cobrem só lógica pura.

- [ ] **INF-5** Backup automático do volume como worker
  - impacto alto · esforço M · dono: IA · depende de: INF-2 · **aguarda dependências**
  - Pronto quando: Worker diário copia o SQLite (backup consistente via API de backup do SQLite) para local fora do volume; retém N dias; aparece em /admin/workers; teste de restauração documentado.
  - Riscos: RSK-3
  - Notas: Guardar fora do container (S3 compatível ou outro disco). Definir onde com o usuário.

- [ ] **INF-6** Alerta quando um worker falha 2 a 3 vezes seguidas
  - impacto médio · esforço P · dono: IA · depende de: PRD-2 · **aguarda dependências**
  - Pronto quando: Após 3 falhas consecutivas o ADM é avisado (e-mail ou tela) uma vez; volta ao normal ao primeiro sucesso.
  - Notas: Histórico já existe em worker_execucoes.

- [ ] **DEC-2** Aval jurídico/LGPD da lista nominal de servidores
  - impacto alto · esforço M · dono: usuário + jurídico
  - Pronto quando: Finalidade, base legal e política de opt-out registradas por escrito antes de usar a lista de clientes novos em produção.
  - Riscos: RSK-1, RSK-2
  - Notas: A lista tem nome de servidores e é para oferta de crédito.

- [ ] **PRD-2** Alertas ativos e resumo diário 08:00 (Diário Oficial relevante, convênio fora do padrão, meta em risco, worker com falha)
  - impacto alto · esforço M · dono: IA · depende de: DEC-6 · **aguarda dependências**
  - Pronto quando: Canal definido (e-mail e/ou WhatsApp); worker de digest às 08:00; regras de relevância por convênio; nunca reenvia o mesmo alerta; teste com fonte simulada.
  - Riscos: RSK-6, RSK-9
  - Notas: Existe outro projeto de WhatsApp (W-API) que pode servir de canal.

- [ ] **DEC-1** Como o Front identifica a DIG
  - impacto alto · esforço P · dono: usuário
  - Pronto quando: Regra documentada (prefixo da equipe, coluna ou outro sistema) e a função empresaDaEquipe em src/lib/empresas.ts ajustada com teste.
  - Riscos: RSK-7
  - Notas: Hoje assume prefixo DIG; o export atual só tem AKRK. Sem dado da DIG a aba dela mostra 'sem dados'.

- [ ] **PRD-1** Tela de Integrações (titular, contato, limites, rotas, troca de chave cifrada)
  - impacto médio · esforço M · dono: IA · depende de: INF-11 · **aguarda dependências**
  - Pronto quando: /admin/integracoes (superadmin) lista as fontes com rotas e limites; edita titular/contato; troca de chave cifrada (AES-256-GCM, mascarada, nunca devolvida ao navegador) com botão testar conexão.
  - Riscos: RSK-6
  - Notas: Trabalho parcial no stash 'integracoes-wip' (git stash list). Núcleo pronto: segredos.ts com 5 testes, registro das integrações e migração do modelo IntegracaoConfig. Refazer sobre o PR 13: o worker federal por API foi removido (chave do Portal não é mais usada; volta nas sanções).

- [ ] **DEC-3** Colunas e status do SELECT do Função
  - impacto médio · esforço P · dono: usuário
  - Pronto quando: SELECT DISTINCT status do Função conferido; STATUS_EFETIVADO em src/lib/transparencia/baseClientes.ts ajustado.
  - Notas: Hoje conta como fechado: PAG, INTEGRAD, EFETIV, AVERBAD, FINALIZAD, CONCLUID.

- [ ] **DEC-4** Localizar os 'clientes que já subimos' e importar em /transparencia
  - impacto médio · esforço P · dono: usuário · depende de: DEC-3 · **aguarda dependências**
  - Pronto quando: Base importada pela tela 'Nossa base de clientes' (guarda só hash). A lista de clientes novos passa a excluir quem já é cliente.
  - Riscos: RSK-1
  - Notas: Não estão no repositório.

- [ ] **PRD-3** Ficha do convênio (vendas, pagos, morte, atos do diário, servidores, penetração, sanções) + linha do tempo de regras + teto de juros do CNPS
  - impacto alto · esforço M · dono: IA · depende de: ~~DAD-5~~
  - Pronto quando: Tela por convênio (10 maiores) juntando as fontes existentes; nenhum número inventado; teste com dados sintéticos.
  - Riscos: RSK-9
  - Notas: É o diferencial: cruza dados que hoje estão em 4 telas.

- [!] **PRD-4** Funil de acionamento da lista de clientes novos + lista de exclusão (opt-out) + conversão por faixa
  - impacto alto · esforço M · dono: IA · depende de: DEC-2
  - Pronto quando: Status por cliente (contatado, interessado, fechou), dono, opt-out permanente que remove da lista; indicador mede também cancelamento e inadimplência das vendas.
  - Riscos: RSK-1, RSK-2
  - Notas: Bloqueado pelo aval jurídico. Opt-out é o item mais importante de LGPD.
  - Bloqueado: depende de outros itens

- [ ] **INF-9** Autenticação em dois fatores para o ADM
  - impacto médio · esforço M · dono: IA
  - Pronto quando: TOTP obrigatório para superadmin, com códigos de recuperação; teste do fluxo.
  - Notas: NextAuth v5 credentials + bcrypt hoje.

- [ ] **DEC-8** Acesso ao Front e ao CCNET ao vivo
  - impacto alto · esforço M · dono: usuário
  - Pronto quando: URL do Front; para o CCNET, relatório com intervalo de datas ou usuário somente leitura de banco (não há API).
  - Riscos: RSK-6
  - Notas: Desbloqueia PRD-7, PRD-11, PRD-12, DAD-1 e DAD-2. Credenciais nunca no chat.

- [ ] **PRD-5** Sanções do grupo (CEIS, CNEP, leniência) por CNPJ + scorecard de promotora
  - impacto médio · esforço M · dono: IA · depende de: DEC-7 · **aguarda dependências**
  - Pronto quando: Worker diário consulta os CNPJs do grupo e parceiros; alerta de sanção nova; lista de CNPJs editável pelo ADM.
  - Riscos: RSK-6
  - Notas: API do Portal da Transparência exige chave gratuita (guardar a que veio por e-mail). Limites: 400/min dia, 700/min de madrugada. Evitar CEAF nominal.

- [ ] **PRD-6** Farol vermelho no Monitoramento: equipes e promotoras para monitorar nos próximos dias
  - impacto médio · esforço P · dono: IA
  - Pronto quando: Seção no /monitoramento com farol por unidade, critério definido com o usuário (ex.: alerta nos últimos N dias).
  - Notas: Critério do farol ainda não definido.

- [ ] **INF-4** Remover PORTAL_TRANSPARENCIA_CHAVE do Ambiente do EasyPanel (guardando a chave)
  - impacto baixo · esforço P · dono: usuário
  - Pronto quando: Variável removida; chave guardada no e-mail/gerenciador para as sanções.
  - Riscos: RSK-6
  - Notas: O código não lê mais essa variável.

- [ ] **DEC-6** Nome final do produto e metas oficiais por empresa
  - impacto baixo · esforço P · dono: usuário
  - Pronto quando: Nome definido em src/lib/marca.ts; metas AKRK e DIG cadastradas em /admin/metas.
  - Notas: Hoje: Painel Executivo (provisório) e meta de MODELO R$ 8.000.000.

- [ ] **DEC-7** CNPJs do grupo e parceiros (promotoras, consignatárias)
  - impacto médio · esforço P · dono: usuário
  - Pronto quando: Lista de CNPJs entregue (AKRK, DIG, Capital Consig, ABC Card e parceiros).

- [!] **PRD-11** Relatório diário automático com os 5 e-mails (Geral + 4 gerentes) e PDF
  - impacto alto · esforço G · dono: IA · depende de: DEC-8, PRD-2
  - Pronto quando: Job diário monta o relatório do dia com dados ao vivo, valida contra as regras (prova de 17/09) e envia 5 e-mails; nunca repete o dia anterior; avisa se o acesso falhar.
  - Riscos: RSK-9, RSK-6
  - Notas: Regras completas no documento do usuário (caso = CPF+tipo+produto, fim do caso, taxa de morte). Envio só com aprovação explícita e endereços reais.
  - Bloqueado: depende de outros itens

- [!] **PRD-7** Qualidade da originação: padrão de erro, SLA por etapa, reinserção com troca de equipe, duplicidade
  - impacto médio · esforço G · dono: IA · depende de: DEC-8
  - Pronto quando: Painel de motivos de reprovação por equipe e operador, tempo por etapa e alerta de reinserção suspeita.
  - Riscos: RSK-9
  - Notas: 'Padrão de erro' ainda não foi definido pelo usuário.
  - Bloqueado: depende de outros itens

- [!] **DAD-1** Fechar a divergência de 'morreu' contra a prova (290 x 289)
  - impacto médio · esforço M · dono: IA · depende de: DEC-8
  - Pronto quando: Geral 17/09 bate 289/464/55 e Reprovado Front/CCNET/Cancelado 89/126/19 com a esteira real do CCNET.
  - Riscos: RSK-9
  - Notas: Hoje a esteira é inferida do status do Front (adaptarFront.ts); sobram 2 casos sem explicação.
  - Bloqueado: depende de outros itens

- [!] **DAD-2** Cancelados de ontem por data real, lista nominal dos que morreram sem reinserir, taxa de morte exata
  - impacto médio · esforço M · dono: IA · depende de: DEC-8
  - Pronto quando: Seções hoje marcadas 'indisponível' passam a mostrar dado real.
  - Riscos: RSK-9
  - Notas: A tela Canceladas e Integradas do CCNET traz a data do evento; paginação da grade é instável.
  - Bloqueado: depende de outros itens

- [!] **PRD-12** Monitoramento por promotora no Função (caso Quero Mais / Gov. PI)
  - impacto médio · esforço M · dono: IA · depende de: DEC-8
  - Pronto quando: Detector (src/lib/monitoramento/detectar.ts) rodando por promotora com 90 dias de dados reais do Função; caso Quero Mais detectado.
  - Riscos: RSK-5
  - Notas: Grade do CCNET tem Corban, Convênio, Tabela, Valor, Situação e Origem, sem CPF.
  - Bloqueado: depende de outros itens

- [ ] **PRD-8** Mercado e retenção: taxas médias do consignado (BCB) x nossas tabelas, carteira para portabilidade, previsão do mês
  - impacto médio · esforço G · dono: IA · depende de: DAD-3 · **aguarda dependências**
  - Pronto quando: Gráficos de taxa por modalidade; previsão de fechamento vs meta; carteira quando houver dado.
  - Riscos: RSK-9
  - Notas: Série do SGS da taxa consignado INSS não confirmada (25471 parece INSS, não verificado).

- [!] **PRD-9** Transparência estadual (MA, TO, SP, PB, MG), fase 2, um portal por vez
  - impacto médio · esforço G · dono: IA · depende de: DEC-2, INF-3
  - Pronto quando: Cada estado com worker e teste; só depois de validar o federal com arquivo real.
  - Riscos: RSK-1, RSK-5
  - Notas: SP capital tem CKAN aberto; estado de SP e demais precisam de pesquisa. O federal usa o arquivo mensal Servidores SIAPE.
  - Bloqueado: depende de outros itens

- [!] **PRD-10** Construtor de relatórios/BI (campos, gráficos padrão, Excel) cruzando Front e CCNET
  - impacto alto · esforço G · dono: IA · depende de: DEC-8
  - Pronto quando: Decisão entre Metabase e construtor próprio; camada de campos aprovada (nada de SQL livre); banco somente leitura; acesso por perfil.
  - Riscos: RSK-6, RSK-7
  - Notas: Metabase não cruza dois bancos: cópia local dos dados é necessária de qualquer forma.
  - Bloqueado: depende de outros itens

- [ ] **PRD-13** Margem real por cliente via averbadora/convênio, com consentimento
  - impacto médio · esforço G · dono: usuário + IA · depende de: DEC-2 · **aguarda dependências**
  - Pronto quando: Fonte e base legal definidas; integração somente para clientes com consentimento.
  - Riscos: RSK-1, RSK-2, RSK-10
  - Notas: Portais públicos não publicam descontos nem margem.

- [ ] **DAD-4** Melhorar a cobertura dos diários parciais (TO, PB, SP capital, Imperatriz, MA, MG)
  - impacto baixo · esforço G · dono: IA
  - Pronto quando: Leitura de PDF para extrair trecho e ato onde a fonte só devolve a edição; paginação onde faltar.
  - Riscos: RSK-5
  - Notas: Querido Diário falhou no TLS daqui; testar do servidor de produção.

- [ ] **DAD-3** Confirmar a série do Banco Central da taxa média do consignado INSS
  - impacto baixo · esforço P · dono: IA
  - Pronto quando: Código da série confirmado com nome oficial e incluído no worker de mercado.
  - Riscos: RSK-9

- [ ] **TEC-2** Plano B para fontes não oficiais (Yahoo Finance, Google Notícias, endpoints internos dos diários)
  - impacto médio · esforço M · dono: IA
  - Pronto quando: Cada fonte com fallback ou aviso claro; monitoramento de quebra de parse nos workers.
  - Riscos: RSK-5
  - Notas: Termos do Google Notícias falam em uso pessoal.

- [ ] **TEC-3** Limpar resíduos: páginas públicas de frentes, tabelas do Jira, evidencia.json fixos e com nomes de operadores
  - impacto baixo · esforço M · dono: IA · depende de: INF-5 · **aguarda dependências**
  - Pronto quando: Rotas /[companySlug] removidas, migração que apaga tabelas do Jira (com backup feito antes) e dados de evidência substituídos por dado ao vivo.
  - Riscos: RSK-3
  - Notas: Só depois do backup: migração destrutiva.

- [ ] **TEC-4** Política de retenção e descarte de dados nominais
  - impacto médio · esforço P · dono: IA + jurídico · depende de: DEC-2 · **aguarda dependências**
  - Pronto quando: Prazos documentados e aplicados por job (hoje listas com mais de 12 meses são apagadas).
  - Riscos: RSK-1

- [ ] **TEC-5** Ampliar a suíte de testes das telas e um CI de verificação antes do merge
  - impacto médio · esforço M · dono: IA · depende de: INF-10 · **aguarda dependências**
  - Pronto quando: GitHub Actions rodando tsc, eslint, testes e build em cada PR.
  - Riscos: RSK-4
  - Notas: Hoje o deploy é automático no push ao master.

- [ ] **INF-11** Trocar NEXTAUTH_SECRET invalida credenciais cifradas (documentar e testar a troca)
  - impacto baixo · esforço P · dono: IA
  - Pronto quando: Procedimento de rotação de segredo documentado e testado.
  - Riscos: RSK-6
  - Notas: Pré-requisito de cuidado antes de guardar chaves de API no banco.

- [ ] **BKL-1** Refinar este backlog com especialistas em paralelo (produto, risco, técnico)
  - impacto médio · esforço P · dono: IA
  - Pronto quando: Três especialistas reavaliam prioridade, riscos e esforço; backlog.json atualizado e revisado com o usuário.
  - Notas: O texto-base está em docs/backlog/insumos.md. Padrão do usuário: sempre agentes especialistas em paralelo.

## Concluídos

- [x] **DEC-5** Liberar as empresas (AKRK/DIG) dos usuários em /admin/settings/users
  - impacto alto · esforço P · dono: usuário · depende de: INF-3
  - Pronto quando: Cada usuário não-superadmin tem empresa marcada (e turma, se gerente). Sem isso ele não vê relatório.
  - Riscos: RSK-7
  - Notas: Regra é falha-fechada de propósito.
  - Concluído em 2026-09-27: Gestão de usuários já permite liberar AKRK e DIG individualmente, persiste apenas empresas válidas no servidor e aplica o escopo em relatórios e monitoramento. Fluxo revisado e coberto por testes de permissão.

- [x] **INF-8** Log de auditoria (acesso a lista nominal, exportações, mudanças de meta e permissão)
  - impacto alto · esforço M · dono: IA
  - Pronto quando: Tabela de auditoria; eventos gravados em planilha, upload de base, mudança de usuário/meta; tela de consulta para superadmin.
  - Riscos: RSK-1, RSK-7
  - Concluído em 2026-09-27: Tabela aditiva de auditoria criada; acessos, login, logout, exportação nominal, upload de base e alterações de usuários, metas e workers são registrados. A lista de usuários mostra a última latitude/longitude autorizada e o ícone de histórico abre consulta paginada exclusiva do superadmin. TypeScript, ESLint, 117 testes da aplicação, 5 testes do backlog, comparação migrações/schema, runner SQLite e build de produção aprovados.

- [x] **DAD-5** Normalizar nomes de convênio (SÃO x SAO e variações)
  - impacto médio · esforço P · dono: IA
  - Pronto quando: Função de normalização única usada por monitoramento, ficha e ranking; teste com os 49 nomes reais.
  - Notas: Hoje infla alertas 'convênio novo'.
  - Concluído em 2026-09-27: Convênios passam por normalização única na entrada do Front e dos diários, unificando caixa, espaços, pontuação e variantes com ou sem acento, como SAO/SÃO.

- [x] **TEC-1** deleteUser mostra mensagem genérica em produção
  - impacto baixo · esforço P · dono: IA
  - Pronto quando: Action devolve {ok:false, erro} em vez de lançar; diálogo mostra o motivo real.
  - Notas: Next mascara erros lançados em produção.
  - Concluído em 2026-09-27: Exclusão de usuário agora retorna mensagens controladas para regras de negócio e uma mensagem genérica para falhas inesperadas, mantendo o erro técnico apenas no log do servidor.

- [x] **DEC-9** Permissões modulares por perfil e usuário
  - impacto baixo · esforço P · dono: usuário
  - Pronto quando: Funcionalidades são configuráveis por perfil e por usuário, com herança, liberação ou bloqueio individual; menu e páginas aplicam a permissão efetiva no servidor.
  - Notas: DEC-9 deixa de ser uma regra fixa no código: Diário Oficial e demais módulos operacionais usam o mesmo catálogo de permissões.
  - Concluído em 2026-09-27: Permissões modulares persistidas por perfil e por usuário, com herança/liberação/bloqueio, menu e páginas protegidos no servidor. Diário Oficial e demais módulos operacionais usam o catálogo comum. TypeScript, ESLint, 118 testes da aplicação, 5 testes do backlog, build e migração limpa aprovados.

- [x] **INF-7** Página de saúde do portal (workers, fontes, último backup)
  - impacto médio · esforço P · dono: IA · depende de: INF-5
  - Pronto quando: Rota de saúde e painel resumido para o ADM.
  - Concluído em 2026-09-28: NOC fixado como último item do menu lateral e da lista de funcionalidades na gestão de acesso.

- [x] **DAD-6** Selic do Banco Central retornou data futura (anomalia da API)
  - impacto baixo · esforço P · dono: IA
  - Pronto quando: Investigado; a tela exibe a data de vigência de forma clara ou usa a série correta.
  - Riscos: RSK-9
  - Concluído em 2026-09-27: Leitura do Banco Central consulta as últimas 10 observações, descarta datas futuras e seleciona o valor válido mais recente no fuso de São Paulo.

- [x] **PRD-14** Menu lateral compacto e páginas Saiba Mais e Custos
  - impacto médio · esforço P · dono: IA
  - Pronto quando: Menu lateral compacto no desktop, navegação móvel a 375px, marca Teck preservada, links administrativos à esquerda e páginas Saiba Mais/Custos publicadas com os valores informados; validações e PR concluídos.
  - Riscos: RSK-7
  - Notas: Solicitado e aprovado pelo usuário em 27/09/2026: opção 2 da prévia, com prioridade ao acesso pelo celular. Refinado para manter todos os links, inclusive Usuários, Metas, Workers e Início, no lado esquerdo.
  - Concluído em 2026-09-27: Menu fixado à esquerda com gatilho antes da marca, rolagem para não esconder itens e links Usuários, Metas e Workers incorporados à navegação lateral. Páginas Saiba Mais e Custos adicionadas com Claude R$ 130, Codex R$ 130, W-API R$ 60 e total R$ 320. TypeScript, ESLint, testes e build aprovados.

- [x] **PRD-15** Cadastro e lançamentos de custos
  - impacto alto · esforço médio · dono: produto + engenharia
  - Pronto quando: Custos podem ser cadastrados e arquivados em tela, com periodicidade e lançamentos por competência, status pago ou pendente e histórico mensal.
  - Notas: Os valores iniciais de Claude, Codex e W-API entram como custos únicos já pagos.
  - Concluído em 2026-09-28: Cadastro de custos movido para modal com validação, estado de salvamento e mensagem de erro, mantendo a grade de custos visível ao fundo.

- [x] **UX-5** Refinar navegação e grade de workers
  - impacto médio · esforço baixo · dono: frontend
  - Pronto quando: Saiba Mais aparece como ícone de informação no topo, a barra visual da lateral não aparece e Workers usa grade responsiva de dois ou três cards.
  - Concluído em 2026-09-27: Saiba Mais virou ícone de informação no topo, a barra visual de rolagem da lateral foi ocultada sem impedir rolagem e Workers passou a grade responsiva com dois cards. TypeScript, ESLint, testes e build aprovados.

- [x] **UX-6** Ampliar e aliviar a interface do portal e login
  - impacto médio · esforço baixo · dono: frontend
  - Pronto quando: Saiba Mais tem chamada visível no topo, o controle hambúrguer fica dentro da lateral, a área útil aproveita monitores largos, o fundo é mais leve, o logo mantém animação moderna e o login tem campos alinhados e conteúdo auxiliar enxuto.
  - Notas: Solicitado após validação visual do menu lateral.
  - Concluído em 2026-09-28: A camada decorativa do login deixou de receber cliques, seleção ou arraste nativo; o canvas foi marcado como não arrastável e o parallax ignora movimentos enquanto algum botão do mouse está pressionado.

- [x] **UX-7** Aplicar máscara monetária brasileira nas metas
  - impacto médio · esforço baixo · dono: frontend
  - Pronto quando: Campos de metas formatam a digitação em reais com pontos de milhar e vírgula decimal, preservando a validação no servidor.
  - Notas: Solicitado após revisão visual das telas administrativas.
  - Concluído em 2026-09-27: Máscara brasileira aplicada durante a digitação, com teclado numérico no celular, limite compatível com a validação existente e teste automatizado da formatação.

- [x] **PRD-16** Monitoramento jurídico dos CNPJs do grupo
  - impacto alto · esforço alto · dono: fullstack
  - Pronto quando: CNPJs são cadastrados em tela e monitorados por rotinas independentes, configuráveis e sem identificadores fixos no código, com consulta cadastral, menções públicas, processos, licitações, sanções, estado por fonte e alertas não vistos.
  - Riscos: RSK-5, RSK-6
  - Notas: Primeira etapa cobre cadastro oficial, menções públicas e CEIS/CNEP. Pesquisa processual completa por parte e busca estruturada de fornecedores no PNCP dependem de conectores específicos das fontes.
  - Concluído em 2026-09-28: Jurídico reorganizado em grade responsiva de cards, com sino e contador de alertas, estado das fontes e página individual com dados, termos, fontes e até 200 eventos do histórico.

## Riscos

| ID | Risco | Gravidade | Mitigação |
|---|---|---|---|
| RSK-1 | LGPD: lista nominal de servidores para oferta de crédito | alta | Aval jurídico, finalidade documentada, opt-out permanente, acesso só superadmin, log de auditoria, retenção curta, guardar só hash da nossa base. |
| RSK-2 | Superendividamento: quem tem mais desconto em folha tem menos margem | alta | Medir cancelamento e inadimplência das vendas de cada acionamento, não só conversão; não incentivar venda a quem não pode pagar. |
| RSK-3 | Perda de dados: volume sem backup e risco de prune apagar o volume | alta | Snapshot manual já; backup automático; nunca docker volume prune nem system prune --volumes. |
| RSK-4 | Deploys empilhados com SQLite (cada merge no master implanta sozinho) | média | Runner de migração com busy timeout (PR 12); evitar vários merges seguidos; CI antes do merge; migrações só aditivas. |
| RSK-5 | Dependência de endpoints não oficiais que podem mudar ou bloquear | média | Falhar para 'indisponível', nunca inventar; alertar quebra de parse; fallback por fonte. |
| RSK-6 | Segredos: chaves de API e credenciais | alta | Cifrar (AES-256-GCM), nunca devolver ao navegador, nunca no chat, variáveis de ambiente no EasyPanel. |
| RSK-7 | Vazamento de dados entre empresas e gerentes | alta | Filtro sempre no servidor, falha fechada, permissões lidas do banco a cada request, nunca enviar JSON completo a componente cliente. |
| RSK-8 | Código externo (patch de outra sessão) entrando no repositório | média | Conferir hash, revisar o conteúdo, validar (tsc, eslint, testes, build) antes do push; o classificador de permissões pode barrar. |
| RSK-9 | Número inventado ou dado sintético apresentado como real | alta | Dado ausente = indisponível; meta de MODELO sempre marcada; provas contra o gabarito antes de gerar dados. |
| RSK-10 | Portais públicos não publicam descontos nem margem | média | Não prometer 'quem tem mais desconto' a partir de dado público; margem real só via averbadora com consentimento. |
