# Decisões

## DEC-010 — Estrutura Comercial no menu

**Data:** 05/10/2026
**Contexto:** rankings, permissões e filtros dependem de nomes textuais recebidos das bases.
**Decisão:** criar a opção **Estrutura Comercial** na área administrativa, próxima de Usuários e Metas. NOC permanece como último item.
**Motivo:** centralizar hierarquia, vínculos pendentes, qualidade e histórico sem aumentar o número de opções principais.
**Impactos:** nova funcionalidade modular, modelos aditivos e migração progressiva.
**Status:** aprovada.

## DEC-011 — Preservar histórico por vigência

**Data:** 05/10/2026
**Contexto:** transferências de equipe ou gerente não podem mover resultados passados.
**Decisão:** vínculos comerciais possuem início e fim de vigência; alterações futuras não reescrevem o passado.
**Alternativas consideradas:** vínculo textual atual; sobrescrita da estrutura; vigência histórica.
**Motivo:** rastreabilidade do resultado comercial e responsabilidade operacional.
**Impactos:** relatórios resolvem a hierarquia pela data do evento.
**Status:** aprovada como fundamento técnico do pacote.

## DEC-012 — Promotoras e Escritório Virtual
Data: 07/10/2026.
Decisão: criar Organograma Promotoras como item próprio do menu principal; primeira entrega com cadastro, filtros, detalhes e histórico. Manter promotoras separadas das equipes internas AKRK. Criar Escritório Virtual dos times, com presença real de usuários conectados e mensagens por sala. Não representar vendedores cadastrados como usuários online. Acesso inicial segue hierarquia/superadmin; ampliação de perfis exige decisão específica.
Origem: solicitações explícitas do usuário no chat.
Status: aprovada para implementação; implantação não executada.

## DEC-013 — Weeky executivo
Data: 09/10/2026.
Origem: solicitação explícita do usuário para criar Weeky com últimos sete dias e foco CEO/CTO.
Decisão: janela móvel incluindo hoje (parcial), comparação com sete dias anteriores; produção, integrações identificadas, cancelamentos da coorte, mix, equipes e qualidade da base. Reutilizar snapshot persistido sem consultas externas ao abrir página. Herda permissão Relatório Gerencial e exige visão Geral da empresa autorizada.
Limite: cobertura das integrações depende das propostas já sincronizadas; valores são contratados, não receita ou valor liberado. Homologação e publicação pendentes.
