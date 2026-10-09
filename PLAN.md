# Plano — PRD-17

| ID | Descrição | Responsável | Status | Dependências | Critério de aceite | Wave |
| --- | --- | --- | --- | --- | --- | --- |
| PRD17-01 | Registrar contrato de dados e decisões | PO + Tech Lead | IN PROGRESS | — | Conceitos e decisões documentados | 0 |
| PRD17-02 | Criar dimensões e vínculos com vigência | Back-end/Dados | IN PROGRESS | PRD17-01 | Sem sobreposição, cruzamento de empresa ou associação por primeiro nome | 1 |
| PRD17-03 | Criar Estrutura Comercial | Front-end/UX | IN PROGRESS | contrato do back-end | Quatro visões responsivas e acessíveis | 1 |
| PRD17-04 | Proteger dados nominais e atualizar dependências críticas | Segurança | IN PROGRESS | — | Acesso nominal exclusivo de superadmin e auditoria sem crítico conhecido aplicável | 1 |
| PRD17-05 | Implementar ingestão e conciliação incremental | Back-end/Dados | TODO | PRD17-02 | Upsert idempotente, watermark e divergências visíveis | 2 |
| PRD17-06 | Separar contratado, integrado e liberado | Back-end + Front-end | TODO | PRD17-05 | Conceitos, períodos e fontes distintos | 2 |
| PRD17-07 | Integrar relatório, Em Atenção e WhatsApp | Full-stack | TODO | PRD17-05, PRD17-06 | Mesmo resultado para os mesmos filtros | 3 |
| PRD17-08 | Executar shadow mode e gabarito real | Data + QA | TODO | PRD17-07 | Diferenças explicadas; dinheiro conciliado até R$ 0,01 | 3 |
| PRD17-09 | Gates UX, segurança, QA e revisão | Especialistas independentes | TODO | PRD17-08 | Nenhum BLOCKER ou CRITICAL | 4 |
| PRD17-10 | PR, homologação e plano de implantação | Orquestrador + PO + DevOps | TODO | PRD17-09 | PR revisável; deploy e rollback documentados | 4 |

## Testes obrigatórios

- vigência antes, durante e depois de transferências;
- homônimos e aliases;
- isolamento entre AKRK e DIG;
- integração posterior à criação;
- liberação parcial e múltipla;
- idempotência do reprocessamento;
- totais do KPI iguais ao drill-down;
- acesso negativo por perfil, empresa e gerente;
- desktop e celular.

## Promotoras e Escritório — 07/10/2026
| ID | Entrega | Responsável | Status | Dependência | Aceite |
|---|---|---|---|---|---|
| PROM-01 | Cadastro persistido, validação e histórico | Back-end | IN PROGRESS | — | Sem vínculo cruzado entre empresas; alterações rastreáveis |
| PROM-02 | Tabela compacta, filtros e diálogo | Front-end/UX | IN PROGRESS | PROM-01 | Cadastro e edição com feedback; acessível em celular |
| OFFICE-01 | Salas por equipe, presença e mensagens | Full-stack | IN PROGRESS | Hierarquia existente | Sessão determina autor; presença expira; mensagens por sala |
| PROM-03 | Integração, testes e revisão independente | Orquestrador/QA | IN PROGRESS | anteriores | TypeScript, lint, testes relevantes e build |

08/10/2026: PROM-01 e PROM-02 implementados e revisados; OFFICE-01 implementado; PROM-03 com testes, TypeScript e build aprovados. Homologação visual, teste multissessão e go-live pendentes.

## WEEKY-01 — 09/10/2026
Solicitação aprovada: nova aba Weeky, dashboard estratégico para CEO e CTO, sempre últimos sete dias.
Wave 1: dados e testes (Back-end), interface (Front-end/UX), navegação e integração (orquestrador) em paralelo, sem sobreposição de arquivos.
Wave 2: revisão independente de QA, segurança de escopo e validação técnica.
Status: REVIEW. Aceite: janela D-6 até hoje em São Paulo, comparação D-13 a D-7, leitura do snapshot, data real de atualização, isolamento por empresa e acesso à visão Geral, layout responsivo. Não altera regras do relatório diário.

## ORG-01 — 09/10/2026
Escopo aprovado: somente promotoras comerciais, Roberto como CEO acima de AKRK e DIG; remover Escritório Virtual e item antigo Organograma Promotoras.
Wave1: UI (organograma), backend (fotos) e integração/menu separados. Wave2: revisão independente cruzada e QA HTTP.
Estado: REVIEW. Critérios implementados: raiz CEO, unidades isoladas, gerente/promotora por vínculo, sem vínculo explícito, busca, expansão, upload autenticado e cadastro preservado. Testes38, lint, TypeScript e build aprovados; prévia local desktop/celular. Homologação com dados reais e publicação pendentes.

## COMP-01 — 09/10/2026
Escopo aprovado: comparação sutil AKRK × DIG na Home, relatório e Weeky, com liderança por contratado, quantidade, participação e atualização. Usar snapshots existentes sem consultas adicionais.
Wave1: agregação/testes (dados), componente/CSS (UI), integração de rotas (orquestrador), sem sobreposição. Wave2: gates independentes cruzados e prévia visual.
Estado: REVIEW. Implementação e 60 testes aprovados; lint aprovado. Regressões: negativos, CPF inválido, data impossível, ACL, cobertura, deduplicação e arredondamento monetário. Build aprovado; PR em finalização; homologação real e go-live pendentes.
