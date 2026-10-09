# Estado atual

Projeto: Portal Teck.
Atualizado: 09/10/2026.
Etapa: comparativo de vendas AKRK × DIG.
Status: implementação e gates independentes aprovados; publicação e homologação real pendentes.
Última entrega anterior: organograma comercial, PR #56 mergeado em master c83f96b. Não confirma implantação no EasyPanel.
Entrega atual: comparativo na Home (hoje), relatório Geral (referência selecionada) e Weeky (sete dias). Somente snapshots locais, sem novas consultas externas. Contratado por criação, propostas válidas conforme relatório diário, incluindo canceladas. Pagos não entram nessa comparação.
Controle: acesso ao relatório, visão Geral e ambas as empresas; sem acesso, componente ausente. Snapshot incompleto, defasado ou incoerente não gera líder nem valores artificiais.
Validações: 60 testes aprovados, lint e revisão independente dados/UI; build aprovado. Prévia local com fixtures em desktop e troca de liderança validada; DOM móvel sem overflow em 434 px. Captura móvel indisponível por timeout do navegador.
Limites: KPIs existentes do Weeky continuam com sua regra atual; o comparativo identifica propostas válidas e pode divergir quando a fonte contém CPF inválido. Sem alteração nas regras existentes.
Próximas ações: abrir PR de revisão, homologar snapshots reais e solicitar aprovação de implantação.
Agentes: dados e UI encerrados após gates; orquestrador finalizando entrega.
Último report: REPORTS/11-comparativo-empresas.md.
