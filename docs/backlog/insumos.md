# Insumos do backlog (base comum dos especialistas)

Portal Teck (Painel Executivo): Next.js 16 + SQLite (Prisma) no EasyPanel, container único, volume `teck-portfolio-data` **sem backup**. Empresas: AKRK e DIG. Convênios que mais vendem: Gov. Maranhão, Tocantins IGEPREV, SP SPPREV, Paraíba, Minas SEPLAG e PMMG, Gov. SP, Imperatriz, Pref. SP, SIAPE.
Estado atual (27/09/2026): relatório e monitoramento por empresa, metas por empresa, Diário Oficial (DOU + 7 diários), workers (15 + servidores federais), Transparência (clientes novos SIAPE, upload de base por hash, planilha), usuários e metas refeitos, runner de migração no boot.

## Infraestrutura e operação (INF)
- INF-1 Estabilizar o EasyPanel (o painel entrou em crash loop; suspeita de disco ou memória). Ver Dashboard (Memória, CPU, Disco).
- INF-2 Snapshot manual do VPS/volume antes de qualquer limpeza (único backup possível hoje).
- INF-3 Confirmar em produção os deploys dos PRs 10 a 13 (workers, runner de migração, transparência) e a 1ª execução do worker de servidores federais.
- INF-4 Remover `PORTAL_TRANSPARENCIA_CHAVE` do EasyPanel (não é mais usada), guardando a chave para as sanções.
- INF-5 Backup automático do volume como worker.
- INF-6 Alerta quando um worker falha 2 a 3 vezes seguidas.
- INF-7 Página de saúde do portal (workers, fontes, último backup).
- INF-8 Log de auditoria (acesso a lista nominal, exportações, mudanças de meta e de permissão).
- INF-9 Autenticação em dois fatores para o ADM.
- INF-10 Teste ponta a ponta no navegador e conferência visual/contraste/celular de todas as telas (nada foi visto renderizado).
- INF-11 Trocar `NEXTAUTH_SECRET` invalida credenciais cifradas (pré-requisito de cuidado da tela de Integrações).

## Decisões e dependências do usuário (DEC)
- DEC-1 Como o Front identifica a DIG (hoje assume prefixo "DIG").
- DEC-2 Aval jurídico/LGPD da lista nominal de servidores (finalidade, base legal, opt-out).
- DEC-3 Colunas e status do SELECT do Função (hoje contam como fechado PAG, INTEGRAD, EFETIV, AVERBAD, FINALIZAD, CONCLUID).
- DEC-4 Onde estão os "clientes que já subimos" para importar em /transparencia.
- DEC-5 Liberar as empresas dos usuários em /admin/settings/users (quem não é superadmin fica sem relatório).
- DEC-6 Nome final do produto (hoje "Painel Executivo") e metas oficiais por empresa.
- DEC-7 CNPJs do grupo e parceiros (promotoras, consignatárias) para sanções.
- DEC-8 Acesso ao Front e ao CCNET ao vivo (URL do Front; CCNET sem API; melhor: relatório com intervalo de datas ou banco).
- DEC-9 Confirmar a intenção de acesso do Diário Oficial (hoje todos os perfis logados veem).

## Produto e oportunidades (PRD)
- PRD-1 Tela de Integrações (titular, contato, limites, rotas, troca de chave cifrada). Trabalho parcial guardado em stash; refazer sobre o PR 13 (o worker federal por API saiu).
- PRD-2 Alertas ativos e resumo diário 08:00 (Diário Oficial relevante, convênio fora do padrão, meta em risco, worker com falha) por e-mail ou WhatsApp.
- PRD-3 Ficha do convênio (vendas, pagos, morte, atos recentes, servidores, penetração, sanções, credenciamento) + linha do tempo de regras + extração do teto de juros do CNPS em gráfico histórico.
- PRD-4 Funil de acionamento da lista de clientes novos (contatado, interessado, fechou, dono) + lista de exclusão (opt-out) + medir conversão por faixa.
- PRD-5 Scorecard de promotora + due diligence por CNPJ (CEIS, CNEP, leniência) com alerta de sanção nova (sanções do grupo).
- PRD-6 Farol vermelho no Monitoramento: equipes e promotoras para monitorar nos próximos dias.
- PRD-7 Qualidade da originação: padrão de erro, SLA por etapa, reinserção com troca de equipe, duplicidade (exige Front e CCNET ao vivo).
- PRD-8 Mercado e retenção: taxas médias do consignado do Banco Central por modalidade contra as nossas tabelas; carteira para portabilidade e refinanciamento; previsão de fechamento do mês.
- PRD-9 Transparência estadual (MA, TO, SP, PB, MG), fase 2, um por vez.
- PRD-10 Construtor de relatórios/BI (campos, gráficos padrão, Excel) cruzando Front e CCNET; comparar Metabase x próprio.
- PRD-11 Relatório diário automático com os 5 e-mails (Geral e 4 gerentes) e PDF; depende de PRD/DEC-8.
- PRD-12 Monitoramento por promotora no Função (caso Quero Mais / Gov. PI); depende de relatório com datas ou banco.
- PRD-13 Margem real por cliente via averbadora/convênio, com consentimento.

## Lacunas de dado (DAD)
- DAD-1 "Morreu" diverge da prova em 1 a 7 casos (290 x 289 no Geral) sem a esteira do CCNET.
- DAD-2 Cancelados de ontem por data real, lista nominal dos que morreram sem reinserir, taxa de morte exata, padrão de erro.
- DAD-3 Série do Banco Central da taxa média do consignado INSS não confirmada.
- DAD-4 Diários com cobertura parcial: TO (só edição), PB (Google Notícias), SP capital (1ª página), Imperatriz lento, MA e MG com 0 atos no mês; Querido Diário falha TLS.
- DAD-5 Normalizar nomes de convênio ("SÃO" x "SAO", variações que inflam alertas).
- DAD-6 Selic do Banco Central retornou data futura (anomalia da API).

## Dívidas técnicas (TEC)
- TEC-1 `deleteUser` mostra mensagem genérica em produção (Next mascara o erro lançado).
- TEC-2 Fontes não oficiais: Yahoo Finance (Ibovespa), Google Notícias (termos de uso pessoal), endpoints internos dos diários.
- TEC-3 Resíduos: páginas públicas de frentes /[companySlug], tabelas do Jira no banco, evidencia.json como retratos fixos, evidencia com nomes de operadores no repositório.
- TEC-4 Retenção de dados nominais (listas com mais de 12 meses já apagam) e política de descarte.
- TEC-5 Suíte de testes não cobre as telas (só lógica pura); sem CI de deploy.

## Riscos já discutidos (RSK)
- RSK-1 LGPD: lista nominal de servidores para oferta de crédito (finalidade compatível, base legal, expectativa do titular, opt-out).
- RSK-2 Superendividamento: buscar quem tem mais desconto em folha é buscar quem tem menos margem; um funil deve medir cancelamento e inadimplência das vendas, não só conversão.
- RSK-3 Perda de dados: volume sem backup; nunca rodar `docker volume prune` ou limpeza com volumes (o volume fica "sem uso" com o serviço parado).
- RSK-4 Deploys empilhados com SQLite: cada merge no master implanta sozinho; mitigado pelo runner de migração, mas sobreposição ainda gera pressão no painel.
- RSK-5 Dependência de endpoints não oficiais que podem mudar ou bloquear.
- RSK-6 Segredos: chaves de API só cifradas e nunca devolvidas ao navegador; nunca no chat.
- RSK-7 Vazamento entre empresas e gerentes: filtro sempre no servidor, falha fechada, nunca enviar o JSON completo a componente cliente.
- RSK-8 Código externo (patch de outra sessão) só entra com hash conferido e revisão do conteúdo.
- RSK-9 Nunca inventar número: dado ausente aparece como indisponível; meta de MODELO sempre marcada.
- RSK-10 Portais públicos não publicam descontos nem margem: o objetivo "quem tem mais desconto em folha" não sai de dado público.
