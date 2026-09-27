# Backlog — Portal Teck (Painel Executivo)

Atualizado em 2026-09-27. **Gerado por `node scripts/backlog.mjs render` a partir de `docs/backlog/backlog.json`: não edite este arquivo à mão.**

**Ao terminar um item, marque como concluído** (obrigatório, no mesmo PR do trabalho):

```bash
node scripts/backlog.mjs concluir <ID> --nota "o que foi feito e como validou"
```

Orientações completas: `docs/backlog/COMO-USAR.md`. Contexto do projeto: `docs/CONTEXTO.md`.

## Resumo

- Pendentes: 36 · Em andamento: 1 · Bloqueados: 8 · Concluídos: 0
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

- [ ] **DEC-5** Liberar as empresas (AKRK/DIG) dos usuários em /admin/settings/users
  - impacto alto · esforço P · dono: usuário · depende de: INF-3 · **aguarda dependências**
  - Pronto quando: Cada usuário não-superadmin tem empresa marcada (e turma, se gerente). Sem isso ele não vê relatório.
  - Riscos: RSK-7
  - Notas: Regra é falha-fechada de propósito.

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
  - impacto alto · esforço M · dono: IA · depende de: DAD-5 · **aguarda dependências**
  - Pronto quando: Tela por convênio (10 maiores) juntando as fontes existentes; nenhum número inventado; teste com dados sintéticos.
  - Riscos: RSK-9
  - Notas: É o diferencial: cruza dados que hoje estão em 4 telas.

- [!] **PRD-4** Funil de acionamento da lista de clientes novos + lista de exclusão (opt-out) + conversão por faixa
  - impacto alto · esforço M · dono: IA · depende de: DEC-2
  - Pronto quando: Status por cliente (contatado, interessado, fechou), dono, opt-out permanente que remove da lista; indicador mede também cancelamento e inadimplência das vendas.
  - Riscos: RSK-1, RSK-2
  - Notas: Bloqueado pelo aval jurídico. Opt-out é o item mais importante de LGPD.
  - Bloqueado: depende de outros itens

- [ ] **INF-8** Log de auditoria (acesso a lista nominal, exportações, mudanças de meta e permissão)
  - impacto alto · esforço M · dono: IA
  - Pronto quando: Tabela de auditoria; eventos gravados em planilha, upload de base, mudança de usuário/meta; tela de consulta para superadmin.
  - Riscos: RSK-1, RSK-7

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

- [ ] **DAD-5** Normalizar nomes de convênio (SÃO x SAO e variações)
  - impacto médio · esforço P · dono: IA
  - Pronto quando: Função de normalização única usada por monitoramento, ficha e ranking; teste com os 49 nomes reais.
  - Notas: Hoje infla alertas 'convênio novo'.

- [ ] **TEC-1** deleteUser mostra mensagem genérica em produção
  - impacto baixo · esforço P · dono: IA
  - Pronto quando: Action devolve {ok:false, erro} em vez de lançar; diálogo mostra o motivo real.
  - Notas: Next mascara erros lançados em produção.

- [ ] **DEC-6** Nome final do produto e metas oficiais por empresa
  - impacto baixo · esforço P · dono: usuário
  - Pronto quando: Nome definido em src/lib/marca.ts; metas AKRK e DIG cadastradas em /admin/metas.
  - Notas: Hoje: Painel Executivo (provisório) e meta de MODELO R$ 8.000.000.

- [ ] **DEC-7** CNPJs do grupo e parceiros (promotoras, consignatárias)
  - impacto médio · esforço P · dono: usuário
  - Pronto quando: Lista de CNPJs entregue (AKRK, DIG, Capital Consig, ABC Card e parceiros).

- [ ] **DEC-9** Confirmar a intenção de acesso do Diário Oficial (hoje todos os perfis logados veem)
  - impacto baixo · esforço P · dono: usuário
  - Pronto quando: Decisão registrada; matriz de acesso em /admin/settings/users ajustada se mudar.
  - Notas: Atos são públicos.

- [ ] **INF-7** Página de saúde do portal (workers, fontes, último backup)
  - impacto médio · esforço P · dono: IA · depende de: INF-5 · **aguarda dependências**
  - Pronto quando: Rota de saúde e painel resumido para o ADM.

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

- [ ] **DAD-6** Selic do Banco Central retornou data futura (anomalia da API)
  - impacto baixo · esforço P · dono: IA
  - Pronto quando: Investigado; a tela exibe a data de vigência de forma clara ou usa a série correta.
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

_Nenhum ainda._

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
