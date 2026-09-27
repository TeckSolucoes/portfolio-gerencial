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
- `src/lib/permissoes.ts`, `acesso.ts`, `empresas.ts`, `metas.ts` acesso por empresa, metas.
- `scripts/boot.sh`, `aplicar-migracoes.cjs`, `migracoes-pendentes.cjs` boot e migração; `scripts/backlog.mjs` este backlog.

## Acesso
Perfis: `superadmin` (tudo, todas as empresas), `gerente`, `visualizador`. Cada usuário tem **empresas liberadas** (`AKRK`,`DIG`) e, opcional, **turma de um gerente**. Permissões lidas do banco a cada request. Sem empresa = não vê relatório (de propósito). Empresa da equipe vem do prefixo (`AKRK - ...`); **a regra da DIG é uma suposição** (DEC-1).

## Regras do relatório (resumo)
- Caso = CPF (dígitos) + tipo (Adiantamento > Compra > Novo) + produto. Lote = dia da 1ª proposta.
- Fim do caso: alguma integrada = Pagou; senão a última proposta: Cancelada = Morreu/Cancelado; esteira reprovada = Morreu/Reprovado CCNET; Front reprovado sem código = Morreu/Reprovado Front; resto = Jornada.
- Taxa de morte = morreu / (pagou + morreu); em branco se ninguém fechou.
- Prova 17/09 (Geral): 122 propostas R$ 977.184,26; 82 novas; 40 reinseridas; 1.331 casos; 578 pagou. "Morreu" hoje 290 (prova 289): sem a esteira do CCNET (DAD-1).
- Valor usado = "Valor Contrato". Desempate de propostas do mesmo dia: número decrescente (reproduz a prova).

## Fontes e limites
Portal da Transparência federal (API: 400/min de dia, 700/min 00–06h, 180/min nas restritas; **não publica descontos nem margem**); DOU e diários estaduais/municipais (sem limite publicado, endpoints internos); Banco Central SGS; Yahoo Finance (não oficial); Google Notícias (uso pessoal). Detalhes por fonte em `docs/BACKLOG.md` (DAD-4, TEC-2).

## O que já está no ar / entregue
Relatório e Monitoramento por empresa; metas por empresa em tela; Diário Oficial (8 fontes) com cache; 15+ workers com tela de controle; usuários e metas no padrão de mercado; Transparência (SIAPE) com planilha e indicador; runner de migração no boot (causa raiz do `database is locked`: o `prisma migrate deploy` não espera quando o container antigo está conectado).

## Bloqueios e cuidados conhecidos
- O classificador de permissões do Claude Code já barrou: coleta em massa de nomes de servidores (mais tarde liberada pelo dono), push de código vindo de patch externo (liberado por pedido explícito). **Não contornar**: explicar ao dono.
- O EasyPanel entrou em crash loop (INF-1). Terminal do EasyPanel quebra colagem: digitar comandos.
- Nenhuma tela foi conferida visualmente por IA (INF-10).

## Onde está o backlog
`docs/BACKLOG.md` (leitura) · `docs/backlog/backlog.json` (fonte) · `docs/backlog/insumos.md` (texto-base) · `docs/backlog/COMO-USAR.md` · `docs/PACOTE-PARA-IAS.md` (tudo em um arquivo).
