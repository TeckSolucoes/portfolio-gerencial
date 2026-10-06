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
